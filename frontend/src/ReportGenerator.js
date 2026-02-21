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
    const doc = new jsPDF('p', 'mm', [210, 310]); // Increased height as requested
    const pageWidth = 210;
    const pageHeight = 310;
    const margin = 10;
    let cursorY = 10;

    // Set document properties for better filename/tab representation
    const filename = `Relatorio_${data.client_name || 'Sem_Nome'}_${format(new Date(), 'dd-MM-yyyy')}`.replace(/\s+/g, '_');
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
        console.warn("Using simulation fallback for header", e);
        // Replicating the model's look as much as possible
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

    // Top Golden Line
    doc.setDrawColor(topGoldColor[0], topGoldColor[1], topGoldColor[2]);
    doc.setLineWidth(0.6);
    doc.line(margin, cursorY, margin + gridW, cursorY);

    // Row 1: CLIENTE (28) | Value (78) | CÓDIGO (20) | Value (15) | DATA (20) | Value (29)
    drawGrayBox(doc, margin, cursorY, 28, rowH, "CLIENTE"); // 28
    drawValueBox(doc, margin + 28, cursorY, 78, rowH, data.client_name); // 106
    drawGrayBox(doc, margin + 106, cursorY, 20, rowH, "CÓDIGO"); // 126
    drawValueBox(doc, margin + 126, cursorY, 15, rowH, data.client_id || ''); // 141
    drawGrayBox(doc, margin + 141, cursorY, 20, rowH, "DATA"); // 161
    drawValueBox(doc, margin + 161, cursorY, 29, rowH, format(new Date(), 'dd/MM/yyyy'), false, true); // 190

    cursorY += rowH;

    // Row 2: CONTATO (28) | Value (78) | E-MAIL (20) | Value (64)
    drawGrayBox(doc, margin, cursorY, 28, rowH, "CONTATO");
    drawValueBox(doc, margin + 28, cursorY, 78, rowH, data.contact_name);
    drawGrayBox(doc, margin + 106, cursorY, 20, rowH, "E-MAIL");
    drawValueBox(doc, margin + 126, cursorY, 64, rowH, data.client_email, false, true);

    cursorY += rowH;

    // Row 3: REPRESENTANTE NCH (width 28) | Value flows until CIDADE-UF (at 106)
    drawGrayBox(doc, margin, cursorY, 28, rowH, "REPRESENTANTE\nNCH", true); // No right line
    drawValueBox(doc, margin + 28, cursorY, 78, rowH, data.representative);
    drawGrayBox(doc, margin + 106, cursorY, 20, rowH, "CIDADE-UF");
    let cityUf = '';
    const addressParts = (data.client_address || '').split(',');
    if (addressParts.length > 1) cityUf = addressParts[addressParts.length - 1].trim();
    else cityUf = data.client_address || '';
    drawValueBox(doc, margin + 126, cursorY, 64, rowH, cityUf, false, true);

    cursorY += rowH;

    // Row 4: Taller row (12)
    const row4H = 12;
    // VISITA (18) | Value (10) | CHAMADO label starts at margin + 28
    drawGrayBox(doc, margin, cursorY, 18, row4H, "VISITA DE\nROTINA");
    drawValueBox(doc, margin + 18, cursorY, 10, row4H, data.visit_type ? "X" : "", true);

    // CHAMADO TÉCNICO starts at margin + 28 (aligning with value boxes above)
    drawGrayBox(doc, margin + 28, cursorY, 45, row4H, "CHAMADO TÉCNICO /\nCOMERCIAL – MOTIVO ->");
    drawValueBox(doc, margin + 73, cursorY, 68, row4H, data.reason);

    // COLETA starts at 141
    drawGrayBox(doc, margin + 141, cursorY, 26, row4H, "COLETA DE\nAMOSTRA :");
    drawValueBox(doc, margin + 167, cursorY, 23, row4H, data.sample_collection || "", false, true);

    cursorY += row4H;
    // Bottom Golden Line
    doc.setDrawColor(topGoldColor[0], topGoldColor[1], topGoldColor[2]);
    doc.setLineWidth(0.6);
    doc.line(margin, cursorY, margin + gridW, cursorY);

    cursorY += 1; // Reduced distance between form and comments sections

    // --- COMENTÁRIOS E AÇÕES ---
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
        // Layout with images
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

            // Add first image on the left
            doc.addImage(firstImg.base64, "JPEG", margin, cursorY, imgW, imgH);

            // Add text on the right
            const textX = margin + imgW + 5;
            const textW = gridW - imgW - 5;
            const commentLines = doc.splitTextToSize(data.comments || '', textW);
            doc.text(commentLines, textX, cursorY + 4);

            cursorY += Math.max(imgH, (commentLines.length * 5)) + 10;

            // Add remaining images below in a grid
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
            console.error(e);
            // Fallback to text only
            const commentLines = doc.splitTextToSize(data.comments || '', gridW - 4);
            doc.text(commentLines, margin + 2, cursorY);
            cursorY += (commentLines.length * 5) + 10;
        }
    } else {
        // Text only layout
        const commentLines = doc.splitTextToSize(data.comments || '', gridW - 4);
        doc.text(commentLines, margin + 2, cursorY);
        cursorY += (commentLines.length * 5) + 10;
    }

    // --- FOOTER HEADER ---
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

    // Signatures Section
    const sigY = footerY + 14;
    const sigW = 45;

    // Representative Signature (Left)
    const repX = margin + 15;
    try {
        const props = doc.getImageProperties(ASSETS.REPRESENTATIVE_SIG);
        const sigRatio = props.height / props.width;
        const sigH = sigW * sigRatio;
        doc.addImage(ASSETS.REPRESENTATIVE_SIG, 'PNG', repX, sigY, sigW, sigH);
    } catch (e) {
        console.warn("Representative signature image not found.", e);
    }

    // Client Signature (Right Corner)
    if (processedClientSig) {
        try {
            const clientSig = processedClientSig;
            const props = doc.getImageProperties(clientSig);
            const ratio = props.height / props.width;
            const clientW = 40; // Smaller width because it's tightly cropped now
            const cH = clientW * ratio;
            const clientX = pageWidth - margin - clientW;

            // Aligned with representative signature sigY
            doc.addImage(clientSig, 'PNG', clientX, sigY, clientW, cH);
        } catch (e) {
            console.warn("Error adding client signature to PDF", e);
        }
    }

    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    const info1 = "AV. DARCI DE CARVALHO DAFFERNER, 200 / BOA VISTA / 18.085-850 SOROCABA-SP";
    const info2 = "TELEFONES (62) 9 9212 2247 - 9 8418 9765 / e-mail lucasnch@hotmail.com";
    doc.text(info1, pageWidth / 2, pageHeight - 7, { align: "center" });
    doc.text(info2, pageWidth / 2, pageHeight - 3, { align: "center" });

    const blobUrl = doc.output('bloburl');
    // window.open(blobUrl, '_blank'); // Let caller handle if needed
    return blobUrl;
};


