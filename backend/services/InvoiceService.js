const PdfPrinter = require('pdfmake/js/Printer').default;
const xml2js = require('xml2js');

class InvoiceService {
    constructor(invoiceRepository) {
        this.invoiceRepository = invoiceRepository;
    }

    async getAllInvoices() {
        return await this.invoiceRepository.findAllWithDetails();
    }

    async createInvoice(data) {
        return await this.invoiceRepository.create(data);
    }

    async generatePdf(invoiceId) {
        const invoice = await this.invoiceRepository.findById(invoiceId);
        if (!invoice || !invoice.xml_url) {
            throw new Error('Nota não encontrada ou XML indisponível');
        }

        const parser = new xml2js.Parser({
            explicitArray: false,
            ignoreNamespaces: true, // Ignorar namespaces facilita a navegação no objeto
            tagNameProcessors: [name => name.split(':').pop()] // Remove prefixos de tags
        });

        const xmlObj = await parser.parseStringPromise(invoice.xml_url);

        // Busca o bloco infNFe independente da profundidade (nfeProc ou direto no NFe)
        const findPath = (obj, target) => {
            if (obj && obj[target]) return obj[target];
            if (typeof obj !== 'object' || obj === null) return null;
            for (let key in obj) {
                const res = findPath(obj[key], target);
                if (res) return res;
            }
            return null;
        };

        const nfe = findPath(xmlObj, 'infNFe');
        if (!nfe) {
            console.error('Estrutura XML recebida:', JSON.stringify(xmlObj).substring(0, 500));
            throw new Error('Não foi possível localizar os dados da NF-e no XML.');
        }

        const emit = nfe.emit || {};
        const dest = nfe.dest || {};
        const ide = nfe.ide || {};
        const items = Array.isArray(nfe.det) ? nfe.det : (nfe.det ? [nfe.det] : []);
        const total = nfe.total?.ICMSTot || nfe.total || {};

        const fonts = {
            Roboto: {
                normal: 'Helvetica',
                bold: 'Helvetica-Bold',
                italics: 'Helvetica-Oblique',
                bolditalics: 'Helvetica-BoldOblique'
            }
        };

        const printer = new PdfPrinter(fonts);

        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [30, 30, 30, 30],
            content: [
                {
                    columns: [
                        { text: 'DANFE\nDocumento Auxiliar da\nNota Fiscal Eletrônica', alignment: 'center', fontSize: 10, bold: true, width: 90 },
                        {
                            stack: [
                                { text: emit.xNome || 'EMITENTE NÃO IDENTIFICADO', bold: true, fontSize: 11 },
                                { text: `${emit.enderEmit?.xLgr || ''}, ${emit.enderEmit?.nro || ''} - ${emit.enderEmit?.xBairro || ''}`, fontSize: 8 },
                                { text: `${emit.enderEmit?.xMun || ''} - ${emit.enderEmit?.UF || ''} | CEP: ${emit.enderEmit?.CEP || ''}`, fontSize: 8 },
                                { text: `CNPJ: ${emit.CNPJ || ''} | IE: ${emit.IE || ''}`, fontSize: 8 },
                            ],
                            width: '*'
                        },
                        {
                            stack: [
                                { text: 'CONTROLE DO FISCO', alignment: 'center', fontSize: 7 },
                                { text: invoice.access_key, alignment: 'center', fontSize: 7, marginTop: 5, wordBreak: 'break-all' },
                                { text: `Nº: ${ide.nNF || ''}`, alignment: 'center', fontSize: 10, bold: true, marginTop: 5 },
                                { text: `SÉRIE: ${ide.serie || ''}`, alignment: 'center', fontSize: 9, bold: true },
                            ],
                            width: 130
                        }
                    ]
                },
                { canvas: [{ type: 'line', x1: 0, y1: 10, x2: 535, y2: 10, lineWidth: 1 }] },

                { text: 'DESTINATÁRIO / REMETENTE', style: 'sectionHeader', marginTop: 15 },
                {
                    table: {
                        widths: ['*', 100, 100],
                        body: [
                            [
                                { text: `NOME / RAZÃO SOCIAL\n${dest.xNome || 'NÃO INFORMADO'}`, fontSize: 8 },
                                { text: `CNPJ / CPF\n${dest.CNPJ || dest.CPF || ''}`, fontSize: 8 },
                                { text: `DATA EMISSÃO\n${ide.dhEmi ? new Date(ide.dhEmi).toLocaleDateString('pt-BR') : ''}`, fontSize: 8 }
                            ],
                            [
                                { text: `ENDEREÇO\n${dest.enderDest?.xLgr || ''}, ${dest.enderDest?.nro || ''} - ${dest.enderDest?.xBairro || ''}`, fontSize: 8 },
                                { text: `MUNICÍPIO\n${dest.enderDest?.xMun || ''}`, fontSize: 8 },
                                { text: `UF / IE\n${dest.enderDest?.UF || ''} / ${dest.IE || ''}`, fontSize: 8 }
                            ]
                        ]
                    },
                    layout: 'lightHorizontalLines',
                    marginTop: 5
                },

                { text: 'CÁLCULO DO IMPOSTO', style: 'sectionHeader', marginTop: 15 },
                {
                    table: {
                        widths: ['*', '*', '*', '*', '*'],
                        body: [
                            [
                                { text: `BASE CÁLC. ICMS\nR$ ${parseFloat(total.vBC || 0).toFixed(2)}`, fontSize: 7 },
                                { text: `VALOR ICMS\nR$ ${parseFloat(total.vICMS || 0).toFixed(2)}`, fontSize: 7 },
                                { text: `BASE ICMS S.T.\nR$ ${parseFloat(total.vBCST || 0).toFixed(2)}`, fontSize: 7 },
                                { text: `VALOR ICMS S.T.\nR$ ${parseFloat(total.vST || 0).toFixed(2)}`, fontSize: 7 },
                                { text: `VALOR PRODUTOS\nR$ ${parseFloat(total.vProd || 0).toFixed(2)}`, fontSize: 7 }
                            ],
                            [
                                { text: `VALOR FRETE\nR$ ${parseFloat(total.vFrete || 0).toFixed(2)}`, fontSize: 7 },
                                { text: `VALOR SEGURO\nR$ ${parseFloat(total.vSeg || 0).toFixed(2)}`, fontSize: 7 },
                                { text: `DESCONTO\nR$ ${parseFloat(total.vDesc || 0).toFixed(2)}`, fontSize: 7 },
                                { text: `OUTRAS DESPESAS\nR$ ${parseFloat(total.vOutro || 0).toFixed(2)}`, fontSize: 7 },
                                { text: `TOTAL DA NOTA\nR$ ${parseFloat(total.vNF || 0).toFixed(2)}`, bold: true, fontSize: 9 }
                            ]
                        ]
                    },
                    layout: 'lightHorizontalLines',
                    marginTop: 5
                },

                { text: 'DADOS DOS PRODUTOS / SERVIÇOS', style: 'sectionHeader', marginTop: 15 },
                {
                    table: {
                        headerRows: 1,
                        widths: [40, '*', 40, 30, 30, 50, 50],
                        body: [
                            [
                                { text: 'CÓDIGO', style: 'tableHeader' },
                                { text: 'DESCRIÇÃO', style: 'tableHeader' },
                                { text: 'NCM', style: 'tableHeader' },
                                { text: 'QTD', style: 'tableHeader' },
                                { text: 'UN', style: 'tableHeader' },
                                { text: 'VLR UNIT', style: 'tableHeader' },
                                { text: 'VLR TOTAL', style: 'tableHeader' }
                            ],
                            ...items.map(item => {
                                const prod = item.prod || {};
                                return [
                                    { text: prod.cProd || '', fontSize: 7 },
                                    { text: prod.xProd || '', fontSize: 7 },
                                    { text: prod.NCM || '', fontSize: 7 },
                                    { text: parseFloat(prod.qCom || 0).toFixed(2), fontSize: 7, alignment: 'right' },
                                    { text: prod.uCom || '', fontSize: 7, alignment: 'center' },
                                    { text: parseFloat(prod.vUnCom || 0).toFixed(2), fontSize: 7, alignment: 'right' },
                                    { text: parseFloat(prod.vProd || 0).toFixed(2), fontSize: 7, alignment: 'right' }
                                ];
                            })
                        ]
                    },
                    layout: 'lightHorizontalLines',
                    marginTop: 5
                }
            ],
            styles: {
                sectionHeader: { fontSize: 7, bold: true, color: '#333' },
                tableHeader: { fontSize: 7, bold: true, color: 'white', fillColor: '#444' }
            },
            defaultStyle: { fontSize: 8 }
        };

        return printer.createPdfKitDocument(docDefinition);
    }
}

module.exports = InvoiceService;
