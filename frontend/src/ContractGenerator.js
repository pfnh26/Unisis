import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

const valorPorExtenso = (valor) => {
    const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
    const dezena1 = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
    const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
    const centenas = ["", "cem", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

    const formatarCentena = (num) => {
        if (num === 0) return "";
        if (num === 100) return "cem";
        let res = "";
        const c = Math.floor(num / 100);
        const d = Math.floor((num % 100) / 10);
        const u = num % 10;

        res += centenas[c];
        if (d > 0 || u > 0) res += " e ";

        if (d === 1) {
            res += dezena1[u];
        } else {
            res += dezenas[d];
            if (d > 0 && u > 0) res += " e ";
            res += unidades[u];
        }
        return res;
    };

    const v = Math.floor(valor);
    const cents = Math.round((valor - v) * 100);

    let porExtenso = "";
    if (v === 0) porExtenso = "zero reais";
    else {
        const milhar = Math.floor(v / 1000);
        const resto = v % 1000;

        if (milhar > 0) {
            porExtenso += (milhar === 1 ? "mil" : formatarCentena(milhar) + " mil");
            if (resto > 0) porExtenso += (resto > 100 && resto % 100 !== 0 ? ", " : " e ");
        }
        porExtenso += formatarCentena(resto);
        porExtenso += (v === 1 ? " real" : " reais");
    }

    if (cents > 0) {
        porExtenso += " e " + (cents === 1 ? "um centavo" : formatarCentena(cents) + " centavos");
    }

    return porExtenso;
};

const numeroParaExtenso = (n) => {
    const unidades = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
    const dezenasTeens = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
    const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
    if (n < 10) return unidades[n];
    if (n < 20) return dezenasTeens[n - 10];
    const d = Math.floor(n / 10);
    const u = n % 10;
    return dezenas[d] + (u > 0 ? " e " + unidades[u] : "");
};

const buildContractPDF = (data) => {
    const doc = new jsPDF();
    const margin = 20;
    let cursorY = 20;

    const addText = (text, size = 10, align = 'left', style = 'normal', lineGap = 1.5) => {
        doc.setFontSize(size);
        doc.setFont("helvetica", style);
        const splitText = doc.splitTextToSize(text, 170);

        if (align === 'justify') {
            doc.text(splitText, margin, cursorY, { align: 'justify', maxWidth: 170 });
        } else if (align === 'center') {
            doc.text(splitText, 105, cursorY, { align: 'center' });
        } else {
            doc.text(splitText, margin, cursorY, { align: align });
        }

        cursorY += (splitText.length * (size / 2)) + lineGap;
        if (cursorY > 275) {
            doc.addPage();
            cursorY = 20;
        }
    };

    const isServico = data.type === 'Prestação de Serviços';

    const getFirstInvoiceDate = () => {
        if (data.first_invoice_date) {
            let dateStr = data.first_invoice_date;
            if (typeof dateStr === 'string' && dateStr.includes('T')) {
                dateStr = dateStr.split('T')[0];
            }
            if (typeof dateStr === 'string' && dateStr.length === 10) {
                const [year, month, day] = dateStr.split('-');
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }
            return new Date(data.first_invoice_date);
        }

        let baseDate;
        if (data.start_date) {
            let dateStr = data.start_date;
            if (typeof dateStr === 'string' && dateStr.includes('T')) {
                dateStr = dateStr.split('T')[0];
            }

            if (typeof dateStr === 'string' && dateStr.length === 10) {
                const [year, month, day] = dateStr.split('-');
                baseDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            } else {
                baseDate = new Date(data.start_date);
            }
        } else {
            baseDate = new Date();
        }

        const day = parseInt(data.payment_day, 10) || 1;
        return new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, day);
    };
    const firstInvoiceDateFormatted = format(getFirstInvoiceDate(), 'dd/MM/yyyy');

    // --- MODEL START ---
    const title = isServico ? "CONTRATO DE PRESTAÇÃO DE SERVIÇO EM BOMBA DOSADORA" : "CONTRATO DE LOCAÇÃO DE BENS MÓVEIS";
    const rolePartner = isServico ? "CONTRATADA" : "LOCADORA";
    const roleClient = isServico ? "CONTRATANTE" : "LOCATÁRIA";

    addText(title, 12, 'center', 'bold', 10);

    addText("Pelo presente instrumento, de um lado:", 10, 'left', 'normal', 5);

    // PARTNER
    const partnerText = `${(data.partner?.name || '').toUpperCase()}, ${data.partner?.type || ''}, sediada ${data.partner?.address || ''}, CEP: ${(data.partner?.data?.cep || data.partner?.cep || '')}, inscrita no CNPJ/MF sob o nº ${data.partner?.cnpj || ''}, neste ato devidamente representada na forma do seu Certificado da Condição de Microempreendedor Individual, doravante denominada como ${rolePartner}, e de outro lado;`;
    addText(partnerText, 10, 'justify', 'normal', 10);

    // CLIENT
    const clientText = `${(data.client?.name || '').toUpperCase()}, sediada ${(data.client?.address || '________________')}, CEP: ${(data.client?.data?.cep || data.client?.cep || '___________')}, inscrita no CNPJ/MF sob o nº ${(data.client?.cnpj || data.client?.cpf || '______________')}, neste ato representada na forma do seu Contrato Social, doravante denominada como ${roleClient}.`;
    addText(clientText, 10, 'justify', 'normal', 10);

    const enuciado = isServico
        ? "Por este Instrumento Particular as partes supramencionadas, tem justo e contratado o seguinte que mutuamente convencionam, outorgam e aceitam, a saber:"
        : `As partes acima elencadas, de comum acordo, têm justas e contratadas o presente ${title}, que mutuamente aceitam e outorgam, mediante as cláusulas e condições abaixo:`;

    addText(enuciado, 10, 'justify', 'normal', 10);

    if (!isServico) {
        // --- LOCAÇÃO SPECIFIC ---
        addText("CLÁUSULA PRIMEIRA – DO OBJETO DO CONTRATO", 10, 'left', 'bold', 5);
        addText("1.1 A LOCADORA declara que é legitima possuidora e proprietária do(s) bem(s) móvel(s) abaixo descrito(s) e caracterizado(s), a(s) qual(si) está cedendo em Locação à LOCATÁRIA, por meio de pagamento mensal, nos termos e condições constantes do presente contrato.", 10, 'justify', 'normal', 5);

        // Table
        const tableY = cursorY;
        doc.rect(margin, tableY, 170, 45);
        doc.line(margin + 30, tableY, margin + 30, tableY + 45);
        doc.line(margin + 130, tableY, margin + 130, tableY + 45);

        doc.setFont("helvetica", "bold");
        doc.text("Quantidade", margin + 2, tableY + 7);
        doc.text("Descrição", margin + 32, tableY + 7);
        doc.text("Valor Mensal (R$)", margin + 132, tableY + 7);
        doc.line(margin, tableY + 10, margin + 170, tableY + 10);

        doc.setFont("helvetica", "normal");
        doc.text(String(data.pump_quantity || 1).padStart(2, '0'), margin + 12, tableY + 25);
        const desc = doc.splitTextToSize("Bomba dosadora da marca SEKO modelo AML200 eletromagnética, analógica, com regulagem manual de vazão em dupla escala (0-100%), com gabinete em plástico e painel em policarbonato, com grau de proteção IP65 (sem tampa).", 95);
        doc.text(desc, margin + 32, tableY + 18);
        doc.text(`R$ ${parseFloat(data.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + 132, tableY + 25);
        cursorY = tableY + 55;

        addText("1.2 A LOCADORA está ciente e de acordo que o(s) Bem(s) cedido(s) em Locação será utilizado em operações da LOCATÁRIA junto a seus clientes/parceiros, autorizando, portanto, desde já a sublocação, locação e/ou cessão do Bem.", 10, 'justify', 'normal', 10);

        addText("CLÁUSULA SEGUNDA – DO(S) BEM(s) CEDIDO(S)", 10, 'left', 'bold', 5);
        addText("2.1 O Bem será entregue pela LOCADORA no endereço abaixo citado, sendo responsável pelas despesas de transporte, carregamento e descarregamento do(s) bem(s), desde o local de sua retirada até o local onde os mesmos serão utilizados.", 10, 'justify', 'normal', 5);
        addText(`Local de Entrega e Utilização: ${data.pump_delivery_address || data.client?.address || ''}`, 10, 'left', 'bold', 10);

        addText("CLÁUSULA TERCEIRA - DA MANUTENÇÃO E DA CONSERVAÇÃO DO(S) BEM(S)", 10, 'left', 'bold', 5);
        addText("3.1 As despesas com manutenção preventiva e corretiva do(S) Bem(S), correrão por conta e risco exclusivo da LOCADORA Exceto eventual manutenção corretiva necessária em razão de danos causados ao(S) Bem(S), decorrentes de ato/fato de comprovada e exclusiva responsabilidade da LOCATÁRIA, praticado durante a vigência do Contrato. Nesse caso a LOCATÁRIA ficará responsável por ressarcir os comprovados custos com a manutenção do(S) Bem(S) Cedido(s).", 10, 'justify', 'normal', 10);

        addText("CLÁUSULA QUARTA – DAS OBRIGAÇÕES DA LOCADORA", 10, 'left', 'bold', 5);
        addText("4.1 Dentre as obrigações gerais da LOCADORA estão compreendidos, de forma exemplificativa, mas não exaustiva, os seguintes deveres:", 10, 'justify', 'normal', 3);
        addText("a) Manter o(s) Bem(s) objeto do presente contrato, livres de ônus, dívidas, encargos e/ou embaraço de qualquer natureza.", 10, 'justify', 'normal', 3);
        addText("b) Fornecer a garantia do(s) bem(s) cedido(s) pelo prazo que viger este contrato.", 10, 'justify', 'normal', 3);
        addText("c) A LOCADORA não tem responsabilidade por eventos tais como o acúmulo de sedimentos, incrustação ou corrosão existente na caixa de abastecimento onde será feita a dosagem de cloro e/ou produtos.", 10, 'justify', 'normal', 10);

        addText("CLAUSULA QUINTA – DAS OBRIGAÇÕES DA LOCATÁRIA", 10, 'left', 'bold', 5);
        addText("5.1 São obrigações da LOCATÁRIA:", 10, 'justify', 'normal', 3);
        addText("a) Pagar, nas datas aprazadas, o valor acordado neste contrato.", 10, 'justify', 'normal', 3);
        addText("b) Utilizar o(s) Bem(s) conforme as instruções da LOCADORA, repassadas por escrito na forma de relatórios mensais deixados pela LOCADORA em duas vias e assinados pela LOCATÁRIA.", 10, 'justify', 'normal', 3);
        addText("c) Devolver o(s) Bem(s) cedido(s) em comodato nas mesmas condições em que lhe foi entregue quando findo ou rescindido o presente ajuste, salvo o desgaste decorrente do uso.", 10, 'justify', 'normal', 3);
        addText("d) Responsabilizar-se pelos danos causados ao(s) BEM(s), decorrentes de ato/fato de comprovada e exclusiva responsabilidade da LOCATÁRIA, praticado durante a vigência do Contrato. Na hipótese de perda total ou extravio do(s) BEM(s) pela LOCATÁRIA, ou ainda, caso esta, cause um dano ao(s) BEM(s) que não seja passível de manutenção, deverá a LOCATÁRIA ressarcir a LOCADORA pelo BEM, em valor não superior a R$ 1.700,00 (Hum Mil e Setecentos Reais).", 10, 'justify', 'normal', 3);
        addText("e) Garantir acesso por parte da LOCADORA ao local onde esteja instalado o(s) BEM(s), objeto deste contrato. Em datas e horários previamente autorizados pela LOCATÁRIA, quando necessária manutenção no(s) BEM(s), ou ainda, intervenção da LOCADORA no intuito de garantir o bom funcionamento do(s) BEM(S). O acesso ao estabelecimento da LOCATÁRIA será restrito aos empregados da LOCADORA devidamente identificados, uniformizados e utilizando EPIs necessários à sua atividade, bem como aqueles exigidos pela LOCATÁRIA.", 10, 'justify', 'normal', 10);

        addText("CLAUSULA SEXTA – DOS VALORES E DA FORMA DE PAGAMENTO", 10, 'left', 'bold', 5);
        const totalVal = parseFloat(data.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        addText(`6.1 A LOCATÁRIA pagará à LOCADORA a quantia mensal de R$: ${totalVal} pela cessão do(s) Bem(s) descrito na cláusula primeira.`, 10, 'justify', 'normal', 3);
        addText(`Para tanto, a LOCADORA emitirá exclusivamente por meio de boletos bancário as correspondentes faturas com os vencimentos para todo dia ${data.payment_day} de cada mês, com a primeira fatura iniciando em ${firstInvoiceDateFormatted}.`, 10, 'justify', 'normal', 3);
        addText(`6.2 A cobrança deverá ser encaminhada à LOCATÁRIA, com pelo menos 10 (dez) dias de antecedência do seu vencimento, por meio do e-mail (${data.client?.email || '____________________'}) para que a mesma possa conferir e providenciar o respectivo pagamento.`, 10, 'justify', 'normal', 3);
        addText("6.3 No caso de falta de pagamento no prazo superior a 03 (três) dias da data de vencimento, correrão multa de 2% (dois por cento) e juros de 1% (um por cento) ao mês.", 10, 'justify', 'normal', 3);
        addText("6.4 Os valores dispostos nesta cláusula são fixos e só poderão ser reajustados após 12 (doze) meses de vigência contratual, mediante negociação por meio de Carta Reajuste aprovada e assinada ente as partes. ", 10, 'justify', 'normal', 10);


        addText("CLAUSULA SÉTIMA – DO PRAZO", 10, 'left', 'bold', 5);
        addText(`7.1 A vigência do contrato será de ${data.duration_months} meses à contar da data de sua primeira fatura (parcela 1 de ${data.duration_months}), podendo ao fim da vigência ser renovado, segundo CLÁUSULA SEXTA 6.4 do presente contrato.`, 10, 'justify', 'normal', 3);
        addText(`7.2 Caso o(s) Bem(s) permaneça em uso e posse da LOCATÁRIA, sem oposição, findando o prazo ajustado na cláusula 7.1 acima, considerar-se-á prorrogado a presente locação por prazo indeterminado, cabendo o seu encerramento a qualquer tempo, por qualquer uma das partes, sem a imposição de multa e/ou penalidade, através de aviso prévio e escrito de 30 (trinta) dias de antecedência. `, 10, 'justify', 'normal', 10);


        addText("CLAUSULA OITAVA – DA RESCISÃO", 10, 'left', 'bold', 3);
        addText("8.1 O presente contrato poderá ser rescindido, de pleno direito, mediante simples comunicação por escrito na ocorrência de qualquer das seguintes hipóteses:", 10, 'justify', 'normal', 3);
        addText("a) Decretação de falência, recuperação judicial ou extrajudicial de qualquer uma das Partes;", 10, 'justify', 'normal', 3);
        addText("b) Se houver inadimplemento da Parte de qualquer das cláusulas ou obrigações deste contrato, desde que não sanadas, no prazo de 15 (quinze) dias contados a partir da notificação da outra Parte.", 10, 'justify', 'normal', 10);

        addText("CLÁUSULA NONA - DAS DISPOSIÇOES GERAIS  ", 10, 'left', 'bold', 3);
        addText("9.1 Qualquer alteração contratual que eventualmente venha a tornar-se necessária, deverá ser tratada com o responsável da LOCADORA juntamente com os representantes legais da LOCATÁRIA. ", 10, 'justify', 'normal', 3);
        addText("9.2 O presente contrato cancela quaisquer contratos ou negociações mantidas entre as partes, anteriores ao presente instrumento, devendo este, prevalecer sobre quaisquer outros acordos firmados e que tenham o mesmo objeto. ", 10, 'justify', 'normal', 3);
        addText("9.3 O presente instrumento abriga as Partes, seus herdeiros e/ou sucessores, a qualquer título. ", 10, 'justify', 'normal', 10);


    } else {
        // --- PRESTAÇÃO DE SERVIÇOS EM BOMBA DOSADORA ---
        const dur = data.duration_months || 12;
        const durExt = numeroParaExtenso(dur);

        addText("CLÁUSULA PRIMEIRA - DO OBJETO", 10, 'left', 'bold', 5);
        addText("1.1 O objeto do presente contrato é a prestação de serviços em uma bomba dosadora de cloro de propriedade da CONTRATANTE.", 10, 'justify', 'normal', 3);
        addText("1.2 A referida bomba é utilizada para realizar a dosagem do produto Hipoclorito de Sódio.", 10, 'justify', 'normal', 10);

        addText("CLÁUSULA SEGUNDA - DA VIGÊNCIA DO CONTRATO", 10, 'left', 'bold', 5);
        addText(`2.1 A vigência do presente contrato será de ${dur} (${durExt}) meses à contar da data de sua primeira fatura (parcela 1 de ${dur}), podendo ao fim da vigência (parcela ${dur} de ${dur}) ser renovado, mediante carta de reajuste aprovada e assinada entre as partes.`, 10, 'justify', 'normal', 10);

        addText("CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DA CONTRATADA", 10, 'left', 'bold', 5);
        addText("3.1 Fará visitas mensais para verificação do residual de cloro e regulagem da bomba dosadora ou sempre que necessário.", 10, 'justify', 'normal', 3);
        addText("3.2 Fica isenta de responsabilidades por eventuais problemas, tais como, o acúmulo de sedimentos, incrustação ou corrosão existente na caixa de abastecimento onde será feita a dosagem de cloro e danos causados por intempéries e/ou descargas elétricas que poderão acarretar danos no equipamento.", 10, 'justify', 'normal', 3);
        addText("3.3 Será responsável pela manutenção como: troca de mangueiras, válvula de injeção, válvula de sucção de produto e limpeza da bomba dosadora de cloro.", 10, 'justify', 'normal', 10);

        addText("CLÁUSULA QUARTA – DAS OBRIGAÇÕES DA CONTRATANTE", 10, 'left', 'bold', 5);
        addText("4.1 Informar a CONTRATADA sobre alterações junto ao poço e/ou casa de bomba, tais como: mudança de vazão, manutenção, violação e outros. ", 10, 'justify', 'normal', 3);
        addText("4.2 Custo com troca de peças da dosadora como: placas eletrônicas, válvulas solenoide e cabeçote PP bem como troca do equipamento em caso de perda por descargas elétricas e/ou outras intempéries.", 10, 'justify', 'normal', 3);
        addText("4.3 Garantir acesso ao local onde esteja instalada a bomba dosadora, objeto deste contrato, sempre no horário de funcionamento da CONTRATANTE.", 10, 'justify', 'normal', 3);
        addText("4.4 Informar a CONTRATADA, com antecedência mínima de 30 (TRINTA) dias, do eventual encerramento das atividades de seu estabelecimento.", 10, 'justify', 'normal', 3);
        addText("4.5 Limpar/Lavar a caixa de abastecimento quando for necessário e/ou recomendado.", 10, 'justify', 'normal', 10);

        addText("CLÁUSULA QUINTA – DOS VALORES E FORMA DE PAGAMENTO", 10, 'left', 'bold', 5);
        const totalVal = parseFloat(data.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const valExtenso = valorPorExtenso(data.total_value || 0);
        addText(`5.1 Pelos serviços e obrigações aqui definidas, a CONTRATANTE pagará à CONTRATADA, mensalmente, o valor de R$ ${totalVal} (${valExtenso}).`, 10, 'justify', 'normal', 5);
        addText(`5.2 Para tanto, A CONTRATADA emitirá exclusivamente por meio de boletos bancários as correspondentes faturas, com vencimentos para todo dia ${data.payment_day} de cada mês, sendo a primeira parcela para dia ${firstInvoiceDateFormatted} que deverão ser encaminhadas à CONTRATANTE, com pelo menos 10 (dez) dias de antecedência do seu vencimento, por meio do e-mail (${data.client?.email || '____________________'}) para que esta possa conferir e providenciar o respectivo pagamento.`, 10, 'justify', 'normal', 5);
        addText("5.3 No caso de falta de pagamento no prazo superior a 03 (três) dias da data de vencimento, correrão multa de 2% (dois por cento) e juros de 1% (um por cento) ao mês.", 10, 'justify', 'normal', 5);
        addText("5.4 Permanecendo a CONTRATANTE na falta de pagamento por prazo superior a 60 (SESSENTA) dias poderá a CONTRATADA rescindir e negativar o presente contrato, junto aos órgãos competentes.", 10, 'justify', 'normal', 3);
        addText("5.5 Os valores dispostos na CLÁUSULA QUINTA 5.1 são fixos, só poderão ser reajustados após vigência contratual, mediante prévia negociação entre as partes conforme CLÁUSULA SEGUNDA 2.1 do referido contrato.", 10, 'justify', 'normal', 10);

        addText("CLÁUSULA SEXTA – DA RESCISÃO", 10, 'left', 'bold', 5);
        addText("6.1 O presente contrato poderá ser rescindido, por qualquer uma das partes, sem a imposição de multa e/ou penalidade, mediante aviso prévio por escrito com 30 (TRINTA) dias de antecedência.", 10, 'justify', 'normal', 3);
        addText("6.2 O presente contrato poderá ser rescindido por qualquer uma das partes quando houver descumprimento de qualquer das cláusulas ou obrigações deste contrato, e que não forem sanadas, no prazo de 30 (TRINTA) dias contados a partir da notificação da Parte reclamante.", 10, 'justify', 'normal', 3);
        addText("6.3 No caso de inadimplência superior a 60 (SESSENTA) dia, conforme CLÁUSULA QUINTA 5.4.", 10, 'justify', 'normal', 10);

        addText("CLÁUSULA SÉTIMA – DAS DISPOSIÇÕES GERAIS", 10, 'left', 'bold', 5);
        addText("7.1 Qualquer alteração contratual que eventualmente venha a tornar-se necessária, deverá ser tratada com o responsável da CONTRATANTE juntamente com os representantes legais da CONTRATADA.", 10, 'justify', 'normal', 3);
        addText("7.2 O presente contrato cancela quaisquer contratos ou negociações mantidas entre as partes, anteriores ao presente instrumento, devendo este, prevalecer sobre quaisquer outros acordos firmados e que tenham o mesmo objeto das partes.", 10, 'justify', 'normal', 3);
        addText("7.3 O presente instrumento obriga as Partes, seus herdeiros e/ou sucessores, a qualquer título.", 10, 'justify', 'normal', 10);

        addText("CLÁUSULA OITAVA – DO FORO", 10, 'left', 'bold', 5);
        addText("Fica eleito o foro da Comarca de Goiânia-Goiás, como competente para dirimir quaisquer dúvidas oriundas deste contrato.", 10, 'justify', 'normal', 10);
    }

    // --- SHARED FOOTER ---
    if (!isServico) { // Only add these if it's not a service contract, as service contract has its own final clauses
        addText("CLAUSULA DÉCIMA – DO FORO  ", 10, 'left', 'bold', 3);
        addText("10.1. O presente contrato será regido e interpretado de acordo com as leis brasileiras, ficando eleito o Foro do local da utilização do(s) Bem(s) cedido(s) em comodato, para dirimir toda e qualquer dúvida ou questão oriunda do presente contrato, com exclusão de qualquer outro por mais privilegiado que seja.  ", 10, 'justify', 'normal', 10);
    }

    addText("E por estarem assim justas e contratadas, assinam as partes o presente contrato em 02 (duas) via de igual teor e para um só efeito, na presença das 02 (duas) testemunhas abaixo elencadas.", 10, 'justify', 'normal', 15);

    if (cursorY > 210) doc.addPage(), cursorY = 20;

    const signingDate = data.created_at ? new Date(data.created_at) : new Date();
    addText(`GOIÂNIA, ${format(signingDate, 'dd/MM/yyyy')}`, 10, 'center', 'normal', 15);

    doc.text("_____________________________________________", 105, cursorY, { align: 'center' });
    doc.text(rolePartner, 105, cursorY + 5, { align: 'center' });

    doc.text("_____________________________________________", 105, cursorY + 35, { align: 'center' });
    doc.text(roleClient, 105, cursorY + 40, { align: 'center' });

    cursorY += 60;
    if (cursorY > 250) {
        doc.addPage();
        cursorY = 20;
    }

    addText("Testemunhas:", 10, 'left', 'bold', 10);

    // Witness lines side by side
    const wLine1 = "__________________________";
    const wLine2 = "2. ___________________________";

    doc.text(wLine1, margin, cursorY);
    doc.text(wLine2, 110, cursorY);

    doc.setFontSize(8);
    cursorY += 5;
    doc.text("Nome:", margin, cursorY);
    doc.text("Nome:", 110, cursorY);

    cursorY += 5;
    doc.text("RG:", margin, cursorY);
    doc.text("RG:", 110, cursorY);

    cursorY += 5;
    doc.text("CPF/MF:", margin, cursorY);
    doc.text("CPF/MF:", 110, cursorY);

    return doc;
};



export const generateContractPDF = (data) => {
    const doc = buildContractPDF(data);
    doc.save(`Contrato_${(data.client?.name || 'Contrato').replace(/\s/g, '_')}.pdf`);
};

export const getContractPDFBlobURL = (data) => {
    const doc = buildContractPDF(data);
    return doc.output('bloburl');
};
