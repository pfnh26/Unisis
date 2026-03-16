import { jsPDF } from 'jspdf';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ASSETS } from './reportAssets';
import INVOICE_LOGO from './invoice_logo.png';
import SERVICE_LOGO from './service_logo.png';

export const generateInvoicePDF = async (invoice, _contract, _partner) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const margin = 10;
    let currentY = 10;
    const boxHeight = 25;

    // Robustly extract objects from the first parameter (invoice)
    const contract = _contract || invoice?.contract || {};
    const partner = _partner || contract?.partner || {};
    const client = contract?.client || {};
    const clientData = client?.data || {};
    const pDataObj = partner?.data || {};

    // Date parsing logic
    let dueDate;
    if (invoice.dueDate && typeof invoice.dueDate === 'string') {
        const [year, month, day] = invoice.dueDate.split('-').map(Number);
        dueDate = new Date(year, month - 1, day);
    } else {
        dueDate = new Date();
    }
    const emissionDate = subDays(dueDate, 6);

    const amount = invoice.amount || 0;
    const installmentLabel = invoice.label || '1/1';
    const installmentParts = installmentLabel.split('/');
    const installmentNumber = installmentParts[0].replace(/parcela/gi, '').trim();
    // Use contract.duration_months if available, otherwise fallback to label part or '1'
    const installmentTotal = contract.duration_months || installmentParts[1] || '1';

    const referenceMonthStr = format(dueDate, "MMMM", { locale: ptBR }).toUpperCase();

    const isServiceContract = String(contract?.type || "").toLowerCase().includes("serviço");
    const headerLogo = SERVICE_LOGO; // Always use the service logo as requested
    const contractTypeLabel = isServiceContract ? "PRESTAÇÃO DE SERVIÇOS" : "LOCAÇÃO";
    const boxTitleLabel = isServiceContract ? "PRESTAÇÃO DE SERVIÇO" : "LOCAÇÃO";

    // --- Helper Functions ---
    const drawBox = (x, y, w, h, title = "", centerTitle = false) => {
        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
        doc.rect(x, y, w, h);
        if (title) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            if (centerTitle) {
                doc.text(title, x + (w / 2), y + 4, { align: "center" });
            } else {
                doc.text(title, x + 2, y + 4);
            }
        }
    };

    // --- Header Section ---
    // Boxes for Logo and Fatura info
    drawBox(margin, 10, 130, 30);
    drawBox(margin + 130, 10, 60, 30);

    // Logo
    try {
        const props = doc.getImageProperties(INVOICE_LOGO);
        const imgRatio = props.height / props.width;

        const maxW = 126;
        const maxH = 26;

        let finalW = maxW;
        let finalH = maxW * imgRatio;

        if (finalH > maxH) {
            finalH = maxH;
            finalW = maxH / imgRatio;
        }

        const xOffset = margin + 2;
        const yOffset = 10 + (30 - finalH) / 2;

        doc.addImage(headerLogo, 'PNG', xOffset, yOffset, finalW, finalH);

        // Add red text below logo - aligned with the logo (margin + 2)
        doc.setTextColor(255, 0, 0); // Red
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        const subLogoText = isServiceContract ? "PRESTAÇÃO DE SERVIÇO" : "LOCAÇÃO DE DOSADORAS";
        doc.text(subLogoText, margin + 2, 38);
    } catch (e) {
        console.error('Error adding logo:', e);
    }

    // Fatura Type and Number
    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.text("FATURA", margin + 160, 18, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Nº ${String(installmentNumber).padStart(3, '0')}`, margin + 160, 26, { align: "center" });

    currentY = 40;

    // --- Tomador & Emission Row ---
    // Left Box: Tomador
    drawBox(margin, currentY, 130, 25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TOMADOR:", margin + 2, currentY + 6);

    doc.setFont("helvetica", "normal");
    const providerName = (partner.razao_social || pDataObj.razao_social || partner.nome_fantasia || partner.name || "N/A").toUpperCase();

    // Dynamic scaling for provider name
    let pNameFontSize = 10;
    doc.setFontSize(pNameFontSize);
    while (doc.getTextWidth(providerName) > 105 && pNameFontSize > 6) {
        pNameFontSize -= 0.5;
        doc.setFontSize(pNameFontSize);
    }
    doc.text(providerName, margin + 24, currentY + 6);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("CNPJ/CPF:", margin + 2, currentY + 12);
    doc.setFont("helvetica", "normal");
    doc.text(partner.cnpj || pDataObj.cnpj || partner.cpf || pDataObj.cpf || "", margin + 24, currentY + 12);

    doc.setFont("helvetica", "bold");
    doc.text("ENDEREÇO:", margin + 2, currentY + 18);
    doc.setFont("helvetica", "normal");
    const providerAddr = `${(pDataObj.logradouro || pDataObj.address || "").toUpperCase()}, ${pDataObj.numero || ""} - ${(pDataObj.bairro || "").toUpperCase()} - CEP: ${pDataObj.cep || ""}`;

    // Dynamic scaling for address to prevent overflow
    let pAddrFontSize = 9;
    doc.setFontSize(pAddrFontSize);
    while (doc.getTextWidth(providerAddr) > 105 && pAddrFontSize > 6) {
        pAddrFontSize -= 0.5;
        doc.setFontSize(pAddrFontSize);
    }
    doc.text(providerAddr, margin + 24, currentY + 18);

    // Right Box: Emission
    drawBox(margin + 130, currentY, 60, 25, "EMISSÃO", true);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(format(emissionDate, 'dd/MM/yyyy'), margin + 160, currentY + 17, { align: "center" });

    currentY += 25;

    // --- Cliente Section ---
    drawBox(margin, currentY, 190, 25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("CLIENTE:", margin + 2, currentY + 6);
    doc.setFont("helvetica", "normal");
    doc.text((client.name || "").toUpperCase(), margin + 24, currentY + 6);

    doc.setFont("helvetica", "bold");
    doc.text("CNPJ/CPF:", margin + 2, currentY + 12);
    doc.setFont("helvetica", "normal");
    const clientCNPJ = clientData.cnpj || clientData.cpf || client.cnpj || client.cpf || "";
    doc.text(clientCNPJ, margin + 24, currentY + 12);

    doc.setFont("helvetica", "bold");
    doc.text("ENDEREÇO:", margin + 2, currentY + 18);
    doc.setFont("helvetica", "normal");
    const clientFullAddress = `${(client.logradouro || client.address || clientData.logradouro || clientData.address || "").toUpperCase()}, ${client.numero || clientData.numero || ""} - ${(client.bairro || clientData.bairro || "").toUpperCase()} - CEP: ${client.cep || clientData.cep || ""}`;

    // Scaling for client address
    let cAddrFontSize = 9;
    doc.setFontSize(cAddrFontSize);
    while (doc.getTextWidth(clientFullAddress) > 165 && cAddrFontSize > 6) {
        cAddrFontSize -= 0.5;
        doc.setFontSize(cAddrFontSize);
    }
    doc.text(clientFullAddress, margin + 24, currentY + 18);

    currentY += 25;

    // Laws Text - Only for Leasing
    if (!isServiceContract) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        doc.text("Com base na lei complementar 116/03 de 31 de julho de 2003, as locações de bens moveis são isentas de emissão de nota fiscal de serviço e recolhimento de ISSQN.", margin, currentY + 4);
        currentY += 7;
    } else {
        // Just move down a bit to maintain spacing if needed, or keep currentY
        currentY += 4;
    }

    // --- Items Table ---
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, margin + 190, currentY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Descrição", margin + 2, currentY + 4);
    doc.text("Valor Unitário", margin + 130, currentY + 4);
    doc.text("Qtd.", margin + 160, currentY + 4);
    doc.text("TOTAL", margin + 190, currentY + 4, { align: "right" });
    doc.line(margin, currentY + 6, margin + 190, currentY + 6);

    currentY += 6;
    doc.setFont("helvetica", "normal");
    const descriptionLine1 = isServiceContract ? "CONTRATO DE PRESTAÇÃO DE SERVIÇOS" : (invoice.description || "CONTRATO DE LOCAÇÃO DE DOSADORA");
    doc.text(descriptionLine1, margin + 2, currentY + 6);
    doc.text(`REFERENTE AO MES DE ${referenceMonthStr}`, margin + 2, currentY + 11);

    doc.text(`R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + 130, currentY + 6);
    doc.text("1", margin + 163, currentY + 6);
    doc.text(`R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + 190, currentY + 6, { align: "right" });

    // Table Borders extension (vertical lines)
    const tableBottom = currentY + 120;
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, margin, tableBottom);
    doc.line(margin + 125, currentY, margin + 125, tableBottom);
    doc.line(margin + 155, currentY, margin + 155, tableBottom);
    doc.line(margin + 175, currentY, margin + 175, tableBottom);
    doc.line(margin + 190, currentY, margin + 190, tableBottom);
    doc.line(margin, tableBottom, margin + 190, tableBottom);

    currentY = tableBottom;

    // --- Footer Regions ---
    drawBox(margin, currentY, 190, 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("INFORMAÇÕES DE PAGAMENTOS E OUTROS", margin + 95, currentY + 5, { align: "center" });

    doc.setFontSize(10);
    const instText = `PARCELA ${String(installmentNumber).padStart(2, '0')} DE ${String(installmentTotal).padStart(2, '0')} VENCIMENTO ${format(dueDate, 'dd/MM/yyyy')}`;
    doc.text(instText, margin + 2, currentY + 13);

    currentY += 18;
    drawBox(margin, currentY, 190, 15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("INFORMAÇÕES BANCÁRIAS", margin + 95, currentY + 5, { align: "center" });

    doc.setFontSize(9);
    const banco = pDataObj.banco || "756 SICOOB";
    const agencia = pDataObj.agencia || "3300";
    const conta = pDataObj.conta || "18.765-8";
    doc.text(`AGENCIA ${agencia} CONTA CORRENTE ${conta} BANCO ${banco}`, margin + 2, currentY + 11);

    currentY += 15;

    // --- Total Box ---
    const totalW = 190;
    const labelW = 125;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);

    doc.rect(margin, currentY, labelW, 6);
    const totalLabel = isServiceContract ? "VALOR TOTAL DA PRESTAÇÃO DE SERVIÇO" : "VALOR TOTAL DA LOCAÇÃO";
    doc.text(totalLabel, margin + (labelW / 2), currentY + 4, { align: "center" });
    doc.rect(margin + labelW, currentY, totalW - labelW, 6);
    doc.text(`R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + 190 - 2, currentY + 4, { align: "right" });

    currentY += 6;
    doc.rect(margin, currentY, labelW, 6);
    doc.text("DESCONTOS", margin + (labelW / 2), currentY + 4, { align: "center" });
    doc.rect(margin + labelW, currentY, totalW - labelW, 6);
    doc.text("R$ 0,00", margin + 190 - 2, currentY + 4, { align: "right" });

    currentY += 6;
    doc.rect(margin, currentY, labelW, 6); // Apenas borda
    doc.text("VALOR LIQUIDO A PAGAR", margin + (labelW / 2), currentY + 4, { align: "center" });

    doc.setFillColor(255, 255, 0); // Amarelo
    doc.rect(margin + labelW, currentY, totalW - labelW, 6, 'FD');
    doc.text(`R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + 190 - 2, currentY + 4, { align: "right" });

    return doc.output('bloburl');
};
