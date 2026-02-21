import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

const buildReceiptPDF = (data) => {
    const doc = new jsPDF();
    const margin = 20;

    // Header
    doc.setFillColor(31, 41, 55);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("ORDEM DE SERVIÇO / RECIBO", margin, 25);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    let y = 50;

    // Sale Info
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO CLIENTE", margin, y);
    doc.line(margin, y + 2, 190, y + 2);
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.text(`Cliente: ${data.client_name}`, margin, y);
    y += 5;
    doc.text(`Data de Execução: ${format(new Date(data.execution_date || new Date()), 'dd/MM/yyyy')}`, margin, y);
    y += 15;

    // Description
    doc.setFont("helvetica", "bold");
    doc.text("DESCRIÇÃO DOS SERVIÇOS / PRODUTOS", margin, y);
    doc.line(margin, y + 2, 190, y + 2);
    y += 10;

    doc.setFont("helvetica", "normal");
    const descLines = doc.splitTextToSize(data.product_description || "", 170);
    doc.text(descLines, margin, y);
    y += (descLines.length * 5) + 15;

    // Values
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL", margin, y);
    doc.line(margin, y + 2, 190, y + 2);
    y += 10;

    doc.setFontSize(16);
    doc.text(`R$ ${parseFloat(data.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 190, y, { align: 'right' });

    y += 30;

    // Signatures
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.line(margin, y, 90, y);
    doc.line(120, y, 190, y);
    y += 5;
    doc.text("Assinatura do Responsável", 55, y, { align: 'center' });
    doc.text("Assinatura do Cliente", 155, y, { align: 'center' });

    return doc;
};

export const generateReceiptPDF = (data) => {
    const doc = buildReceiptPDF(data);
    doc.save(`Recibo_${data.client_name.replace(/\s/g, '_')}_${format(new Date(), 'ddMMyy')}.pdf`);
};

export const getReceiptPDFBlobURL = (data) => {
    const doc = buildReceiptPDF(data);
    return doc.output('bloburl');
};
