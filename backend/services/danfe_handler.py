import sys
import os
import re
import base64
import gzip
import json
import time
from datetime import datetime

# Configura encoding para evitar problemas com acentos em pipes (Node.js spawn)
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

try:
    from pynfe.processamento.comunicacao import ComunicacaoSefaz
    from pynfe.processamento.assinatura import AssinaturaA1
    from pynfe.utils import etree as pynfe_etree
except ImportError:
    print(json.dumps({"error": "Missing pynfe library. Install with 'pip install pynfe'"}))
    sys.exit(1)

# ─────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────

def limpar(s):
    if not s: return ""
    return re.sub(r'[^0-9]', '', str(s))

def find_tag(xml_str, tag_path):
    if not xml_str: return None
    content = xml_str
    for part in tag_path.split('/'):
        pattern = rf'<(?:[^:>]+:)?{re.escape(part)}[^>]*>(.*?)</(?:[^:>]+:)?{re.escape(part)}>'
        m = re.search(pattern, content, re.DOTALL)
        if m: content = m.group(1).strip()
        else: return None
    return content

def get_valor_limpo(v):
    if not v: return "0.00"
    m = re.search(r'[\d\.,]+', str(v))
    if not m: return "0.00"
    val = m.group(0).replace(',', '.')
    if val.count('.') > 1:
        parts = val.split('.')
        val = "".join(parts[:-1]) + "." + parts[-1]
    return val

# ─────────────────────────────────────────────
#  MANIFESTAÇÃO
# ─────────────────────────────────────────────

def manifestar(chave, cert_path, cert_pass, cnpj, tp_evento, uf_comprador='GO', justificativa=None):
    # EXTREMAMENTE IMPORTANTE: A SEFAZ pode ser rígida com acentos dependendo do órgão emissor.
    # O bot original usava ACENTOS. Vamos seguir o bot exatamente.
    desc_evento = {
        '210200': 'Confirmação da Operação',
        '210210': 'Ciência da Operação',
        '210220': 'Operação não Realizada',
        '210240': 'Desconhecimento da Operação'
    }.get(tp_evento, 'Ciência da Operação')
    
    c_orgao  = '91' 
    n_seq    = '1'
    # Data com timezone conforme bot
    dh_evento = datetime.now().strftime('%Y-%m-%dT%H:%M:%S') + '-03:00'
    id_evento = f"ID{tp_evento}{chave}{n_seq.zfill(2)}"

    NS_NFE = 'http://www.portalfiscal.inf.br/nfe'
    evento = pynfe_etree.Element('evento', versao='1.00', xmlns=NS_NFE)
    inf    = pynfe_etree.SubElement(evento, 'infEvento', Id=id_evento)

    pynfe_etree.SubElement(inf, 'cOrgao').text    = c_orgao
    pynfe_etree.SubElement(inf, 'tpAmb').text     = '1' # Produção
    pynfe_etree.SubElement(inf, 'CNPJ').text      = cnpj
    pynfe_etree.SubElement(inf, 'chNFe').text     = chave
    pynfe_etree.SubElement(inf, 'dhEvento').text  = dh_evento
    pynfe_etree.SubElement(inf, 'tpEvento').text  = tp_evento
    pynfe_etree.SubElement(inf, 'nSeqEvento').text = n_seq
    pynfe_etree.SubElement(inf, 'verEvento').text = '1.00'

    det = pynfe_etree.SubElement(inf, 'detEvento', versao='1.00')
    pynfe_etree.SubElement(det, 'descEvento').text = desc_evento

    if tp_evento == '210220':
        just = justificativa or "Operação não realizada"
        pynfe_etree.SubElement(det, 'xJust').text = str(just)[:255]

    try:
        a1 = AssinaturaA1(cert_path, cert_pass)
        evt_assinado = a1.assinar(evento)
        
        # O bot usa ComunicacaoSefaz com a UF do comprador
        con = ComunicacaoSefaz(uf=uf_comprador, certificado=cert_path,
                                certificado_senha=cert_pass, homologacao=False)
        resp = con.evento(modelo='nfe', evento=evt_assinado)

        c_stat = find_tag(resp.text, 'cStat')
        if c_stat in ('128', '135', '136', '573', '648'):
            return True, resp.text
        else:
            x_motiv = find_tag(resp.text, 'xMotivo') or "Erro desconhecido"
            return False, f"cStat {c_stat}: {x_motiv}"
    except Exception as e:
        return False, f"Erro comunicacao: {str(e)}"

# ─────────────────────────────────────────────
#  DOWNLOAD E EXTRAÇÃO
# ─────────────────────────────────────────────

def baixar_xml(chave, cert_path, cert_pass, cnpj, uf_comprador='GO'):
    con = ComunicacaoSefaz(uf=uf_comprador, certificado=cert_path, certificado_senha=cert_pass, homologacao=False)
    # Tenta busca por chave
    try:
        resp = con.consulta_distribuicao(cnpj=cnpj, chave=chave)
        if "docZip" in resp.text:
            docs = re.findall(r'<docZip[^>]*>(.*?)</docZip>', resp.text)
            for d in docs:
                xml = gzip.decompress(base64.b64decode(d)).decode('utf-8')
                if (chave in xml) and ('nfeProc' in xml or '<NFe' in xml or 'procNFe' in xml):
                    return xml
    except: pass
    
    # Varredura NSU
    ult = 0
    for _ in range(30):
        try:
            resp = con.consulta_distribuicao(cnpj=cnpj, nsu=ult, consulta_nsu_especifico=False)
            if "docZip" in resp.text:
                docs = re.findall(r'<docZip[^>]*>(.*?)</docZip>', resp.text)
                for d in docs:
                    xml = gzip.decompress(base64.b64decode(d)).decode('utf-8')
                    if (chave in xml) and ('nfeProc' in xml or '<NFe' in xml or 'procNFe' in xml): return xml
            
            cstat = find_tag(resp.text, 'cStat')
            u = find_tag(resp.text, 'ultNSU')
            m = find_tag(resp.text, 'maxNSU')
            if not u or u == m or cstat in ('137', '000'): break
            ult = int(u)
            time.sleep(0.5)
        except: break
    return None

def extract_data(xml_str):
    """Extrai os dados no formato exato que o InventoryService.js espera."""
    def tag(t): return find_tag(xml_str, t)
    
    # Debug para ver se o XML chegou
    if not xml_str:
        return {"analise": {}, "duplicatas": []}

    # Tenta extrair dados do emitente com múltiplos fallbacks
    cnpj_emit = limpar(tag('emit/CNPJ') or tag('CNPJ'))
    if not cnpj_emit:
        # Busca bruta por qualquer tag CNPJ dentro de emit
        emit_block = re.search(r'<emit[^>]*>(.*?)</emit>', xml_str, re.DOTALL)
        if emit_block:
            cnpj_emit = limpar(find_tag(emit_block.group(1), 'CNPJ'))

    val_total = get_valor_limpo(tag('total/ICMSTot/vNF') or tag('vNF'))
    dh_emi = tag('ide/dhEmi') or tag('dhEmi') or tag('dEmi')

    analise = {
        "cnpj_emitente": cnpj_emit,
        "valor_total": val_total,
        "data_emissao": dh_emi,
        "itens": []
    }
    
    det_blocks = re.findall(r'<det[^>]*>(.*?)</det>', xml_str, re.DOTALL)
    for i, p in enumerate(det_blocks):
        def ptag(t): return find_tag(p, t)
        
        # Fallbacks para impostos caso as tags aninhadas falhem
        v_icms = get_valor_limpo(find_tag(p, 'vICMS') or "0.00")
        v_ipi = get_valor_limpo(find_tag(p, 'vIPI') or "0.00")
        v_pis = get_valor_limpo(find_tag(p, 'vPIS') or "0.00")
        v_cofins = get_valor_limpo(find_tag(p, 'vCOFINS') or "0.00")
        
        analise["itens"].append({
            "codigo": ptag('prod/cProd') or f"ALT_{i+1}",
            "descricao": ptag('prod/xProd') or "Item sem nome",
            "unidade": ptag('prod/uCom') or "UN",
            "valor_unitario": get_valor_limpo(ptag('prod/vUnCom')),
            "quantidade": get_valor_limpo(ptag('prod/qCom')),
            "ncm": ptag('prod/NCM'),
            "cfop": ptag('prod/CFOP'),
            "v_bc": get_valor_limpo(find_tag(p, 'vBC') or "0.00"),
            "v_icms": v_icms,
            "v_ipi": v_ipi,
            "v_pis": v_pis,
            "v_cofins": v_cofins
        })

    duplicatas = []
    dup_blocks = re.findall(r'<dup[^>]*>(.*?)</dup>', xml_str, re.DOTALL)
    for d in dup_blocks:
        duplicatas.append({
            "numero": find_tag(d, 'nDup') or "1",
            "valor": get_valor_limpo(find_tag(d, 'vDup')),
            "vencimento": find_tag(d, 'dVenc')
        })
        
    return {"analise": analise, "duplicatas": duplicatas}

# ─────────────────────────────────────────────
#  EXECUÇÃO
# ─────────────────────────────────────────────

def run_process(chave_in, cnpj_in, cert_path, cert_pass):
    # Limpeza rigorosa
    chave = limpar(chave_in)
    cnpj = limpar(cnpj_in)
    
    if len(chave) != 44:
        return {"error": f"Chave de acesso inválida (contém {len(chave)} dígitos, esperado 44)"}

    if not os.path.exists(cert_path):
        return {"error": f"Arquivo de certificado não encontrado: {cert_path}"}

    try:
        # 1. Manifestar (Ciência)
        # UF comprador hardcoded 'GO' pois é o que está no bot e no log do usuário
        ok, res = manifestar(chave, cert_path, cert_pass, cnpj, '210210', uf_comprador='GO')
        if not ok:
            # 573: Duplicado, 648: Já manifestado
            if "573" not in res and "648" not in res:
                return {"error": f"Falha na manifestação: {res}"}
        
        # 2. Aguardar (Opcional, mas recomendado)
        time.sleep(8)
        
        # 3. Baixar
        xml = baixar_xml(chave, cert_path, cert_pass, cnpj, uf_comprador='GO')
        if not xml:
            return {"error": "XML completo não localizado após manifestação. Tente novamente em alguns segundos."}
            
        # 4. Extrair
        result_data = extract_data(xml)
        
        return {
            "success": True,
            "analise": result_data["analise"],
            "duplicatas": result_data["duplicatas"],
            "xml": xml
        }

    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print(json.dumps({"error": "Uso incorreto do script."}))
        sys.exit(1)
        
    # Pega argumentos e força limpeza
    res = run_process(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
    print(json.dumps(res))
