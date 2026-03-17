import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ASSETS } from './reportAssets';

const drawGrayBox = (doc, x, y, w, h, text, isLast = false) => {
    doc.setFillColor(230, 230, 230); // Lighter gray matching model
    doc.rect(x, y, w, h, 'F');
    doc.setDrawColor(0, 0, 0); // Black borders for the grid cells
    doc.setLineWidth(0.1);

    // Draw internal divider only if not the last box in the segment
    if (!isLast) {
        doc.line(x + w, y, x + w, y + h);
    }
    // Draw bottom line
    doc.line(x, y + h, x + w, y + h);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5); // Slightly smaller for better fit
    doc.setTextColor(50, 50, 50);

    const lines = text.split('\n');
    if (lines.length > 1) {
        // Reduced gap between lines for labels (tighter spacing)
        const lineHeight = 2.5;
        const totalTextHeight = (lines.length - 1) * lineHeight;
        const startY = y + (h / 2) - (totalTextHeight / 2) + 0.5;

        lines.forEach((line, i) => {
            doc.text(line.toUpperCase(), x + 2, startY + (i * lineHeight), { baseline: 'middle' });
        });
    } else {
        doc.text(text.toUpperCase(), x + 2, y + (h / 2) + 0.5, { baseline: 'middle' });
    }
};

const drawSectionHeader = (doc, x, y, w, h, text1, text2 = null) => {
    doc.setFillColor(230, 230, 230);
    doc.rect(x, y, w, h, 'F');
    doc.setDrawColor(141, 137, 85);
    doc.setLineWidth(0.5);
    doc.line(x, y, x + w, y);
    doc.line(x, y + h, x + w, y + h);
    doc.setTextColor(141, 137, 85);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    if (text2) {
        doc.text(text1, x + 3, y + (h / 2) + 0.5, { baseline: 'middle' });
        doc.text(text2, x + (w / 2) + 5, y + (h / 2) + 0.5, { baseline: 'middle' });
    } else {
        doc.text(text1, x + (w / 2), y + (h / 2) + 0.5, { align: 'center', baseline: 'middle' });
    }
};

const drawValueBox = (doc, x, y, w, h, value, center = false, isLast = false) => {
    doc.setFillColor(255, 255, 255);
    doc.rect(x, y, w, h, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.1);

    if (!isLast) {
        doc.line(x + w, y, x + w, y + h);
    }
    // Draw bottom line
    doc.line(x, y + h, x + w, y + h);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5); // Slightly larger for better readability
    doc.setTextColor(0, 0, 0);
    if (value) {
        const textStr = String(value);
        if (center) {
            doc.text(textStr, x + (w / 2), y + (h / 2) + 0.5, { align: 'center', baseline: 'middle' });
        } else {
            const lines = doc.splitTextToSize(textStr, w - 4);
            // Adjusting baseline for values to look more centered
            doc.text(lines, x + 2, y + (h / 2) + 0.8, { baseline: 'middle' });
        }
    }
};


const fixOrientation = (src) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onerror = () => resolve(src); // Fallback to original
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = src;
    });
};

const trimSignature = (src) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onerror = () => resolve(src);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const pixels = ctx.getImageData(0, 0, img.width, img.height);
            const l = pixels.data.length;
            let i, bound = { top: null, left: null, right: null, bottom: null };

            for (i = 0; i < l; i += 4) {
                // If pixel is NOT transparent and NOT pure white (handling both transparency and white bg)
                const r = pixels.data[i];
                const g = pixels.data[i + 1];
                const b = pixels.data[i + 2];
                const a = pixels.data[i + 3];

                const isBlank = a === 0 || (r > 250 && g > 250 && b > 250);

                if (!isBlank) {
                    const x = (i / 4) % img.width;
                    const y = ~~((i / 4) / img.width);

                    if (bound.top === null || y < bound.top) bound.top = y;
                    if (bound.left === null || x < bound.left) bound.left = x;
                    if (bound.right === null || x > bound.right) bound.right = x;
                    if (bound.bottom === null || y > bound.bottom) bound.bottom = y;
                }
            }

            if (bound.top === null) return resolve(src); // Empty signature

            // Add a small 5px margin
            const margin = 5;
            const startX = Math.max(0, bound.left - margin);
            const startY = Math.max(0, bound.top - margin);
            const endX = Math.min(img.width, bound.right + margin);
            const endY = Math.min(img.height, bound.bottom + margin);

            const trimWidth = endX - startX;
            const trimHeight = endY - startY;
            const trimmed = ctx.getImageData(startX, startY, trimWidth, trimHeight);

            const copy = document.createElement('canvas');
            const copyCtx = copy.getContext('2d', { willReadFrequently: true });
            copy.width = trimWidth;
            copy.height = trimHeight;
            copyCtx.putImageData(trimmed, 0, 0);

            resolve(copy.toDataURL('image/png'));
        };
        img.src = src;
    });
};

const addImagePreserveRatio = (doc, img, x, y, maxW, maxH) => {
    let imgW, imgH;
    if (typeof img === 'string') {
        const props = doc.getImageProperties(img);
        imgW = props.width;
        imgH = props.height;
    } else {
        imgW = img.width;
        imgH = img.height;
    }

    const ratio = imgH / imgW;
    let finalW = maxW;
    let finalH = maxW * ratio;

    if (finalH > maxH) {
        finalH = maxH;
        finalW = maxH / ratio;
    }

    doc.addImage(img, 'PNG', x, y, finalW, finalH);
    return finalH;
};

export const generateReportPDF = async (data, imageBlobs = []) => {
    if (data.report_type === '02') {
        return await generateReport02PDF(data, imageBlobs);
    }

    const doc = new jsPDF('p', 'mm', [210, 310]);
    const pageWidth = 210;
    const pageHeight = 310;
    const margin = 10;
    let cursorY = 10;

    // Set document properties
    const reportDate = data.created_at ? new Date(data.created_at) : new Date();
    const filename = `Relatorio_${data.client_name || 'Sem_Nome'}_${format(reportDate, 'dd-MM-yyyy')}`.replace(/\s+/g, '_');
    doc.setProperties({
        title: filename,
        subject: 'Relatório de Visita NCH',
        author: 'NCH UniSis'
    });

    // Process all images to fix orientation from mobile devices
    const processedImages = await Promise.all(imageBlobs.map(async img => {
        const fixed = await fixOrientation(img.base64);
        return { base64: fixed };
    }));

    let processedClientSig = data.client_signature;
    if (data.client_signature) {
        processedClientSig = await trimSignature(data.client_signature);
    }

    // --- HEADER ---
    const topGoldColor = [141, 137, 85];
    try {
        const imgWidth = pageWidth - (margin * 2);
        const props = doc.getImageProperties(ASSETS.HEADER_IMG);
        const ratio = props.height / props.width;
        const imgHeight = imgWidth * ratio;

        doc.addImage(ASSETS.HEADER_IMG, 'PNG', margin, cursorY, imgWidth, imgHeight);
        cursorY += imgHeight + 3;
    } catch (e) {
        doc.setFillColor(0, 91, 161);
        doc.rect(margin, cursorY, 22, 18, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("NCH", margin + 11, cursorY + 11, { align: "center" });
        doc.setFillColor(0, 174, 239);
        doc.rect(margin, cursorY + 18, 22, 4, 'F');
        doc.setFontSize(4);
        doc.text("CHEM-AQUA", margin + 11, cursorY + 21, { align: "center" });

        doc.setTextColor(topGoldColor[0], topGoldColor[1], topGoldColor[2]);
        doc.setFontSize(22);
        doc.setFont("times", "bold");
        doc.text("RELATÓRIO DE VISITAS", pageWidth - margin - 20, cursorY + 12, { align: "right" });
        cursorY += 28;
    }

    // --- DATA GRID ---
    const gridW = pageWidth - (margin * 2);
    const rowH = 9;

    doc.setDrawColor(topGoldColor[0], topGoldColor[1], topGoldColor[2]);
    doc.setLineWidth(0.6);
    doc.line(margin, cursorY, margin + gridW, cursorY);

    drawGrayBox(doc, margin, cursorY, 28, rowH, "CLIENTE");
    drawValueBox(doc, margin + 28, cursorY, 78, rowH, data.client_name);
    drawGrayBox(doc, margin + 106, cursorY, 20, rowH, "CÓDIGO");
    drawValueBox(doc, margin + 126, cursorY, 15, rowH, data.client_id || '');
    drawGrayBox(doc, margin + 141, cursorY, 20, rowH, "DATA");
    drawValueBox(doc, margin + 161, cursorY, 29, rowH, format(reportDate, 'dd/MM/yyyy'), false, true);

    cursorY += rowH;

    drawGrayBox(doc, margin, cursorY, 28, rowH, "CONTATO");
    drawValueBox(doc, margin + 28, cursorY, 78, rowH, data.contact_name);
    drawGrayBox(doc, margin + 106, cursorY, 20, rowH, "E-MAIL");
    drawValueBox(doc, margin + 126, cursorY, 64, rowH, data.client_email, false, true);

    cursorY += rowH;

    drawGrayBox(doc, margin, cursorY, 28, rowH, "REPRESENTANTE\nNCH", true);
    drawValueBox(doc, margin + 28, cursorY, 78, rowH, data.representative);
    drawGrayBox(doc, margin + 106, cursorY, 20, rowH, "CIDADE-UF");
    let cityUf = '';
    const addressParts = (data.client_address || '').split(',');
    if (addressParts.length > 1) cityUf = addressParts[addressParts.length - 1].trim();
    else cityUf = data.client_address || '';
    drawValueBox(doc, margin + 126, cursorY, 64, rowH, cityUf, false, true);

    cursorY += rowH;

    const row4H = 12;
    drawGrayBox(doc, margin, cursorY, 18, row4H, "VISITA DE\nROTINA");
    drawValueBox(doc, margin + 18, cursorY, 10, row4H, data.visit_type ? "X" : "", true);
    drawGrayBox(doc, margin + 28, cursorY, 45, row4H, "CHAMADO TÉCNICO /\nCOMERCIAL – MOTIVO ->");
    drawValueBox(doc, margin + 73, cursorY, 68, row4H, data.reason);
    drawGrayBox(doc, margin + 141, cursorY, 26, row4H, "COLETA DE\nAMOSTRA :");
    drawValueBox(doc, margin + 167, cursorY, 23, row4H, data.sample_collection || "", false, true);

    cursorY += row4H;
    doc.setDrawColor(topGoldColor[0], topGoldColor[1], topGoldColor[2]);
    doc.setLineWidth(0.6);
    doc.line(margin, cursorY, margin + gridW, cursorY);

    cursorY += 1;

    try {
        const props = doc.getImageProperties(ASSETS.SECTION_LABEL_IMG);
        const ratio = props.height / props.width;
        const barH = gridW * ratio;
        doc.addImage(ASSETS.SECTION_LABEL_IMG, 'PNG', margin, cursorY, gridW, barH);
        cursorY += barH + 4;
    } catch (e) {
        drawSectionHeader(doc, margin, cursorY, gridW, 8, "COMENTÁRIOS E AÇÕES");
        cursorY += 12;
    }

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    const maxPhotoW = 80;
    const maxPhotoH = 65;

    if (processedImages && processedImages.length > 0) {
        const firstImg = processedImages[0];
        try {
            const props = doc.getImageProperties(firstImg.base64);
            const ratio = props.height / props.width;
            let imgW = maxPhotoW;
            let imgH = imgW * ratio;
            if (imgH > maxPhotoH) {
                imgH = maxPhotoH;
                imgW = imgH / ratio;
            }
            doc.addImage(firstImg.base64, "JPEG", margin, cursorY, imgW, imgH);
            const textX = margin + imgW + 5;
            const textW = gridW - imgW - 5;
            const commentLines = doc.splitTextToSize(data.comments || '', textW);
            doc.text(commentLines, textX, cursorY + 4);
            cursorY += Math.max(imgH, (commentLines.length * 5)) + 10;

            if (processedImages.length > 1) {
                let xPos = margin;
                const gridPhotoW = (gridW - 5) / 2;
                const gridPhotoH = 50;
                for (let i = 1; i < processedImages.length; i++) {
                    const imgObj = processedImages[i];
                    if (cursorY + gridPhotoH > pageHeight - 60) {
                        doc.addPage();
                        cursorY = 20;
                        xPos = margin;
                    }
                    try {
                        const pProps = doc.getImageProperties(imgObj.base64);
                        const pRatio = pProps.height / pProps.width;
                        let pW = gridPhotoW;
                        let pH = pW * pRatio;
                        if (pH > gridPhotoH) {
                            pH = gridPhotoH;
                            pW = pH / pRatio;
                        }
                        doc.addImage(imgObj.base64, "JPEG", xPos, cursorY, pW, pH);
                        xPos += gridPhotoW + 5;
                        if (xPos > margin + gridW - 10) {
                            xPos = margin;
                            cursorY += gridPhotoH + 5;
                        }
                    } catch (e) { console.error(e); }
                }
            }
        } catch (e) {
            const commentLines = doc.splitTextToSize(data.comments || '', gridW - 4);
            doc.text(commentLines, margin + 2, cursorY);
            cursorY += (commentLines.length * 5) + 10;
        }
    } else {
        const commentLines = doc.splitTextToSize(data.comments || '', gridW - 4);
        doc.text(commentLines, margin + 2, cursorY);
        cursorY += (commentLines.length * 5) + 10;
    }

    const footerY = pageHeight - 50;
    try {
        const props = doc.getImageProperties(ASSETS.FOOTER_LABEL_IMG);
        const ratio = props.height / props.width;
        const footBarH = gridW * ratio;
        doc.addImage(ASSETS.FOOTER_LABEL_IMG, 'PNG', margin, footerY, gridW, footBarH);
    } catch (e) {
        drawSectionHeader(doc, margin, footerY, gridW, 7, "CONTATO PARA VENDAS", "RECEBIMENTO DO RELATÓRIO");
    }

    doc.setTextColor(50, 50, 50);
    const sigY = footerY + 14;
    const sigW = 45;
    const repX = margin + 15;
    try {
        const props = doc.getImageProperties(ASSETS.REPRESENTATIVE_SIG);
        const sigRatio = props.height / props.width;
        const sigH = sigW * sigRatio;
        doc.addImage(ASSETS.REPRESENTATIVE_SIG, 'PNG', repX, sigY, sigW, sigH);
    } catch (e) { }

    if (processedClientSig) {
        try {
            const clientSig = processedClientSig;
            const props = doc.getImageProperties(clientSig);
            const ratio = props.height / props.width;
            const clientW = 40;
            const cH = clientW * ratio;
            const clientX = pageWidth - margin - clientW;
            doc.addImage(clientSig, 'PNG', clientX, sigY, clientW, cH);
        } catch (e) { }
    }

    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    const info1 = "AV. DARCI DE CARVALHO DAFFERNER, 200 / BOA VISTA / 18.085-850 SOROCABA-SP";
    const info2 = "TELEFONES (62) 9 9212 2247 - 9 8418 9765 / e-mail lucasnch@hotmail.com";
    doc.text(info1, pageWidth / 2, pageHeight - 7, { align: "center" });
    doc.text(info2, pageWidth / 2, pageHeight - 3, { align: "center" });

    return doc.output('bloburl');
};

const generateReport02PDF = async (data, imageBlobs) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 5;
    let cursorY = 5;

    const gridW = pageWidth - (margin * 2);

    // Header Dosadora
    doc.setDrawColor(180, 180, 180);
    doc.rect(margin, cursorY, gridW, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("DOSADORAS AUTOMÁTICAS", pageWidth / 2, cursorY + 10, { align: "center" });
    doc.setFontSize(11);
    doc.text("LOCAÇÃO, MANUTENÇÃO E VENDA.", pageWidth / 2, cursorY + 16, { align: "center" });
    cursorY += 20;

    // Report Title
    doc.rect(margin, cursorY, gridW, 8);
    doc.setFontSize(12);
    doc.text("RELATÓRIO", pageWidth / 2, cursorY + 6, { align: "center" });
    cursorY += 8;

    // Header Table
    const drawCell = (x, y, w, h, label, val) => {
        doc.rect(x, y, w, h);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(label + ":", x + 1, y + 4);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        if (val) {
            const labelW = doc.getTextWidth(label + ":") + 2;
            const maxValW = w - labelW - 1;
            const cleanVal = String(val).replace(/\n/g, ' ');
            const truncatedVal = doc.splitTextToSize(cleanVal, maxValW)[0];
            doc.text(truncatedVal, x + labelW, y + 4);
        }
    };

    const rowH = 6;
    const reportDate = data.created_at ? new Date(data.created_at) : new Date();
    const dateStr = format(reportDate, 'dd / MM / yyyy');

    // Reset colors to default black and white
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
    doc.setFillColor(255, 255, 255);

    drawCell(margin, cursorY, 60, rowH, "DATA", dateStr);
    drawCell(margin + 60, cursorY, gridW - 60, rowH, "CNPJ / CPF", data.client_cnpj || "");
    cursorY += rowH;

    drawCell(margin, cursorY, 115, rowH, "CLIENTE", data.client_name);
    drawCell(margin + 115, cursorY, gridW - 115, rowH, "RESPONSÁVEL", data.contact_name);
    cursorY += rowH;

    drawCell(margin, cursorY, 115, rowH, "ENDEREÇO", data.client_address);
    drawCell(margin + 115, cursorY, gridW - 115, rowH, "CIDADE", data.client_city);
    cursorY += rowH;

    drawCell(margin, cursorY, 80, rowH, "TELEFONE", data.client_phone);
    drawCell(margin + 80, cursorY, gridW - 80, rowH, "E-MAIL", data.client_email);
    cursorY += rowH;

    // Motivo da Visita
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, cursorY, gridW, 5, 'F');
    doc.rect(margin, cursorY, gridW, 5);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("MOTIVO DA VISITA", pageWidth / 2, cursorY + 3.5, { align: "center" });
    cursorY += 5;

    const colW = gridW / 3;
    const drawCheck = (x, y, label, checked) => {
        doc.rect(x, y, colW, rowH);
        doc.setFontSize(7);
        doc.setTextColor(0, 0, 0);
        doc.text(label + ":", x + 2, y + 4);
        doc.rect(x + colW - 10, y + 1, 4, 4);
        if (checked) {
            doc.line(x + colW - 10, y + 1, x + colW - 6, y + 5);
            doc.line(x + colW - 10, y + 5, x + colW - 6, y + 1);
        }
    };

    drawCheck(margin, cursorY, "ROTINA", data.reason === "Rotina");
    drawCheck(margin + colW, cursorY, "PROBLEMA COM EQUIPAMENTO", data.reason === "Problema com Equipamento");
    drawCheck(margin + (colW * 2), cursorY, "CONSERTO DE EQUIPAMENTO", data.reason === "Conserto de Equipamento");
    cursorY += rowH;

    const halfW = gridW / 2;
    // Manutenção section title and Regulagem
    // DRAW BACKGROUNDS FIRST
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, cursorY, halfW, 8, 'F');
    doc.rect(margin + halfW, cursorY, gridW - halfW, 8, 'F');

    // DRAW BORDERS
    doc.setDrawColor(0, 0, 0);
    doc.rect(margin, cursorY, halfW, 8);
    doc.rect(margin + halfW, cursorY, gridW - halfW, 8);

    // DRAW TEXT
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    doc.text("MANUTENÇÃO DE EQUIPAMENTOS EM COMODATO:", margin + 2, cursorY + 5);
    doc.text("REGULAGEM / DOSADOR:", margin + halfW + 5, cursorY + 5);

    // Dosage boxes
    doc.setFont("helvetica", "normal");
    doc.rect(margin + halfW + 45, cursorY + 2.5, 3, 3);
    if (data.dosage_regulation === '20%') {
        doc.line(margin + halfW + 45, cursorY + 2.5, margin + halfW + 48, cursorY + 5.5);
        doc.line(margin + halfW + 45, cursorY + 5.5, margin + halfW + 48, cursorY + 2.5);
    }
    doc.text("20%", margin + halfW + 49, cursorY + 5);

    doc.rect(margin + halfW + 65, cursorY + 2.5, 3, 3);
    if (data.dosage_regulation === '100%') {
        doc.line(margin + halfW + 65, cursorY + 2.5, margin + halfW + 68, cursorY + 5.5);
        doc.line(margin + halfW + 65, cursorY + 5.5, margin + halfW + 68, cursorY + 2.5);
    }
    doc.text("100%", margin + halfW + 69, cursorY + 5);

    cursorY += 8;

    // Equipment Table Header
    // DRAW BACKGROUNDS FIRST
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, cursorY, 35, rowH, 'F');
    doc.rect(margin + 35, cursorY, 35, rowH, 'F');
    doc.rect(margin + 70, cursorY, gridW - 70, rowH, 'F');

    // DRAW BORDERS
    doc.setDrawColor(0, 0, 0);
    doc.rect(margin, cursorY, 35, rowH);
    doc.rect(margin + 35, cursorY, 35, rowH);
    doc.rect(margin + 70, cursorY, gridW - 70, rowH);

    // DRAW TEXT
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("ITEM", margin + 2, cursorY + 4);
    doc.text("SITUAÇÃO", margin + 37, cursorY + 4);
    doc.text("OBSERVAÇÕES:", margin + 72, cursorY + 4);
    cursorY += rowH;

    const equipmentTableStartY = cursorY;
    data.equipment_items.forEach(item => {
        doc.rect(margin, cursorY, 35, rowH);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(item.name, margin + 2, cursorY + 4);

        // SITUAÇÃO
        doc.rect(margin + 35, cursorY, 35, rowH);
        doc.rect(margin + 36, cursorY + 1.5, 3, 3);
        if (item.status === 'OK') {
            doc.line(margin + 36, cursorY + 1.5, margin + 39, cursorY + 4.5);
            doc.line(margin + 36, cursorY + 4.5, margin + 39, cursorY + 1.5);
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.text("OK", margin + 40, cursorY + 4);

        doc.rect(margin + 48, cursorY + 1.5, 3, 3);
        if (item.status === 'SUBSTITUÍDO') {
            doc.line(margin + 48, cursorY + 1.5, margin + 51, cursorY + 4.5);
            doc.line(margin + 48, cursorY + 4.5, margin + 51, cursorY + 1.5);
        }
        doc.text("SUBSTITUÍDO", margin + 52, cursorY + 4);

        cursorY += rowH;
    });

    // Draw a single big rectangle for the entire Observations column
    const totalEquipmentH = data.equipment_items.length * rowH;
    doc.rect(margin + 70, equipmentTableStartY, gridW - 70, totalEquipmentH);

    // Render consolidated observations if available
    if (data.equipment_obs) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        const wrappedObs = doc.splitTextToSize(data.equipment_obs, gridW - 74);
        doc.text(wrappedObs, margin + 72, equipmentTableStartY + 4);
    } else {
        // Fallback for old data or item-specific obs
        doc.setFontSize(7);
        data.equipment_items.forEach((item, idx) => {
            if (item.obs) {
                const yPos = equipmentTableStartY + (idx * rowH) + 4;
                doc.text(doc.splitTextToSize(item.obs, gridW - 74)[0] || "", margin + 72, yPos);
            }
        });
    }

    // Manutenção Equipamento Cliente
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, cursorY, gridW, 5, 'F');
    doc.rect(margin, cursorY, gridW, 5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("MANUTENÇÃO DE EQUIPAMENTO DO CLIENTE", pageWidth / 2, cursorY + 3.5, { align: "center" });
    cursorY += 5;

    const thirdW = gridW / 3;
    drawCell(margin, cursorY, thirdW, rowH, "MARCA", data.client_brand);
    drawCell(margin + thirdW, cursorY, thirdW, rowH, "MODELO", data.client_model);
    drawCell(margin + (thirdW * 2), cursorY, thirdW, rowH, "NÚMERO DE SÉRIE", data.client_serial);
    cursorY += rowH;

    // Defeito Box
    doc.rect(margin, cursorY, gridW, rowH);
    doc.setFont("helvetica", "bold");
    doc.text("DEFEITO CONSTATADO:", margin + 2, cursorY + 4);
    cursorY += rowH;
    doc.rect(margin, cursorY, gridW, 12);
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(data.defect_found || "", gridW - 4), margin + 2, cursorY + 4);
    cursorY += 12;

    // Serviço Box
    doc.rect(margin, cursorY, gridW, rowH);
    doc.setFont("helvetica", "bold");
    doc.text("SERVIÇO REALIZADO:", margin + 2, cursorY + 4);
    cursorY += rowH;
    doc.rect(margin, cursorY, gridW, 12);
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(data.service_performed || "", gridW - 4), margin + 2, cursorY + 4);
    cursorY += 12;

    // Observações Box
    doc.rect(margin, cursorY, gridW, rowH);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("OBSERVAÇÕES:", margin + 2, cursorY + 4);
    cursorY += rowH;
    doc.rect(margin, cursorY, gridW, 35);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(doc.splitTextToSize(data.comments || "", gridW - 4), margin + 2, cursorY + 4);
    cursorY += 35;

    // Photos if any
    if (imageBlobs && imageBlobs.length > 0) {
        if (cursorY + 50 > pageHeight - 40) {
            doc.addPage();
            cursorY = 10;
        }
        let xPos = margin;
        const photoW = (gridW - 10) / 3;
        const photoH = 35;
        for (let i = 0; i < imageBlobs.length; i++) {
            const img = imageBlobs[i];
            const fixed = await fixOrientation(img.base64);
            doc.addImage(fixed, "JPEG", xPos, cursorY + 2, photoW, photoH);
            xPos += photoW + 5;
            if (xPos > margin + gridW - 10) {
                xPos = margin;
                cursorY += photoH + 5;
                if (cursorY + photoH > pageHeight - 40) {
                    doc.addPage();
                    cursorY = 10;
                }
            }
        }
        cursorY += photoH + 10;
    }

    // Signatures
    const sigAreaY = pageHeight - 35;
    doc.line(margin, sigAreaY, margin + gridW, sigAreaY);
    doc.line(pageWidth / 2, sigAreaY, pageWidth / 2, pageHeight - margin);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("CONTATO:", margin + 2, sigAreaY + 4);
    doc.text("RECEBIMENTO DO RELATÓRIO:", pageWidth / 2 + 2, sigAreaY + 4);

    if (data.client_signature) {
        try {
            const sig1 = await trimSignature(data.client_signature);
            doc.addImage(sig1, 'PNG', margin + 5, sigAreaY + 5, 40, 20);
        } catch (e) { }
    }
    if (data.second_signature) {
        try {
            const sig2 = await trimSignature(data.second_signature);
            doc.addImage(sig2, 'PNG', pageWidth / 2 + 5, sigAreaY + 5, 40, 20);
        } catch (e) { }
    }

    doc.setFontSize(7);
    doc.text("", margin + 2, pageHeight - 7); // Footer info removed as requested

    return doc.output('bloburl');
};


