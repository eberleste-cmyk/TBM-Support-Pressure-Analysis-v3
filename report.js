import { showModal, closeModal } from './ui.js';

async function addImageFromElement(doc, elementId, pageDetails, options, titleText = null, titleLevel = 2) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const wasHidden = element.classList.contains('hidden');
    if (wasHidden) {
        element.classList.remove('hidden');
        // Give non-chart elements a moment to render if they were hidden
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    try {
        const canvas = await html2canvas(element, { 
            scale: 2, 
            backgroundColor: '#ffffff',
            onclone: (clonedDoc) => {
                const mirror = clonedDoc.getElementById('emax_ci_mirror');
                const input = clonedDoc.getElementById('emax_ci_override');
                if (mirror && input && input.value) {
                    mirror.classList.remove('hidden');
                    mirror.classList.add('flex'); // Ensure it centers text if needed
                    input.style.visibility = 'hidden';
                }
            }
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.75);
        const imgProps = doc.getImageProperties(imgData);
        
        const opts = options || {};
        const widthFactor = opts.widthFactor || 1.0;
        const totalWidth = pageDetails.pageWidth - 2 * pageDetails.margin;
        let imgWidth = totalWidth * widthFactor;
        let xPos = pageDetails.margin + (totalWidth - imgWidth) / 2;
        let imgHeight = (imgProps.height * imgWidth) / imgProps.width;

        const availableHeight = pageDetails.pageHeight - 2 * pageDetails.margin;
        let titleHeight = titleText ? 10 : 0;
        const maxImgHeight = availableHeight - titleHeight;

        if (imgHeight > maxImgHeight) {
            imgHeight = maxImgHeight;
            imgWidth = (imgProps.width * imgHeight) / imgProps.height;
            xPos = pageDetails.margin + (totalWidth - imgWidth) / 2;
        }
        
        const totalBlockHeight = titleHeight + imgHeight + 10;
        if (pageDetails.yPos + totalBlockHeight > pageDetails.pageHeight - pageDetails.margin) {
            doc.addPage();
            pageDetails.yPos = pageDetails.margin;
        }

        if (titleText) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(titleText, pageDetails.margin, pageDetails.yPos);
            pageDetails.toc.push({ title: titleText, page: doc.internal.getNumberOfPages(), level: titleLevel });
            pageDetails.yPos += titleHeight;
        }

        doc.addImage(imgData, 'JPEG', xPos, pageDetails.yPos, imgWidth, imgHeight);
        pageDetails.yPos += imgHeight + 10;
    } finally {
        if (wasHidden) element.classList.add('hidden');
    }
}


/**
 * Special handler for capturing tab panes. It switches to the tab,
 * waits for the chart to render, and then calls the image capture function.
 */
async function addChartPaneToPdf(doc, pageDetails, tabName, paneId, title) {
    // Switch to the correct tab, which triggers chart rendering
    if (window.handleTabClick) {
        window.handleTabClick(tabName);
    }
    // Wait for the chart animation and rendering to complete.
    await new Promise(resolve => setTimeout(resolve, 750));

    // Now capture the pane. The pane is already visible, so wasHidden will be false.
    await addImageFromElement(doc, paneId, pageDetails, null, title, 2);
}


export async function generatePDFReport(soilLayers) {
    showModal('Generating Report', 'Please wait while the PDF is being created...', true);
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let yPos = margin;
        let toc = [];

        // --- Cover Page ---
        const company = document.getElementById('report_company').value || 'N/A';
        const preparedBy = document.getElementById('report_prepared_by').value || 'N/A';
        const crossSection = document.getElementById('report_cross_section').value || 'N/A';
        const reportDateInput = document.getElementById('report_date').value;
        const reportDate = reportDateInput ? new Date(reportDateInput).toLocaleDateString(undefined, {year: 'numeric', month: 'long', day: 'numeric'}) : new Date().toLocaleDateString(undefined, {year: 'numeric', month: 'long', day: 'numeric'});

        doc.setFontSize(22).setFont('helvetica', 'bold').text('TBM Support Pressure Analysis Report', pageWidth / 2, 60, { align: 'center' });
        doc.setFontSize(14).setFont('helvetica', 'normal').text(`Project: ${crossSection}`, pageWidth / 2, 80, { align: 'center' });
        doc.setFontSize(12).text(`Company: ${company}`, pageWidth / 2, 100, { align: 'center' });
        doc.text(`Prepared By: ${preparedBy}`, pageWidth / 2, 110, { align: 'center' });
        doc.text(`Date: ${reportDate}`, pageWidth / 2, 120, { align: 'center' });
        doc.setFontSize(10).text('Calculation based on DAUB Recommendations (2016)', pageWidth / 2, 140, { align: 'center' });

        const pageDetails = { yPos, margin, pageHeight, pageWidth, toc };

        // --- Input Data Page ---
        doc.addPage();
        yPos = margin;
        doc.setFontSize(16).setFont('helvetica', 'bold').text('1. Input Parameters', margin, yPos);
        toc.push({ title: '1. Input Parameters', page: doc.internal.getNumberOfPages(), level: 1 });
        yPos += 10;
        
        doc.setFontSize(12).setFont('helvetica', 'bold').text('1.1 Geometry, Factors, and Models', margin, yPos);
        toc.push({ title: '1.1 Geometry, Factors, and Models', page: doc.internal.getNumberOfPages(), level: 2 });
        yPos += 7;

        const k2Select = document.getElementById('k2_model');
        const sigmaVSelect = document.getElementById('sigma_v_model');
        const applySilo = document.getElementById('apply_silo').checked;

        // Get text from selects and replace unicode/html entities for PDF compatibility
        let k2ModelText = k2Select.options[k2Select.selectedIndex].text.split(' - ')[0];
        k2ModelText = k2ModelText.replace(/&amp;/g, '&').replace(/K₂/g, 'K2').replace(/k₀/g, 'k0').replace(/kₐ/g, 'ka').replace(/φ'/g, "phi'");

        let sigmaVModelText = sigmaVSelect.options[sigmaVSelect.selectedIndex].text.split(' - ')[0];

        const geometryBody = [
            ['Tunnel Diameter (D)', `${document.getElementById('D').value} m`],
            ['Crown Overburden (t_crown)', `${document.getElementById('t_crown').value} m`],
            ['Permanent Surcharge (sigma_s,p)', `${document.getElementById('sigma_s_p').value} kN/m²`],
            ['Traffic Surcharge (sigma_s,t)', `${document.getElementById('sigma_s_t').value} kN/m²`],
            ['Groundwater Level (h_w)', `${document.getElementById('h_w').value} m`],
            ['Slurry Weight (No Lowering)', `${document.getElementById('gamma_S').value} kN/m³`],
            ['Slurry Level (Partial)', `${document.getElementById('slurry_level_partial').value} % of D`],
            ['Slurry Weight (Partial)', `${document.getElementById('gamma_S_partial').value} kN/m³`],
            ['Lateral Pressure Model (K2)', k2ModelText],
            ['Vertical Stress Model (sigma_v)', sigmaVModelText],
            ['Grain Size (d10)', `${document.getElementById('d10').value} mm`],
            ['Yield Point (tau_f)', `${document.getElementById('tau_f').value} N/m²`],
        ];

        if (applySilo) {
            geometryBody.push(
                ['Silo Theory Applied (for sigma_v,max)', 'Yes'],
                ['Silo Theory K1 Value', document.getElementById('silo_k1').value]
            );
        }

        geometryBody.push(
            ['Safety Factor, Earth (eta_E)', document.getElementById('eta_E').value],
            ['Safety Factor, Water (eta_W)', document.getElementById('eta_W').value],
            ['Support Pressure Deviation (Delta)', `${document.getElementById('delta_P').value} kN/m²`]
        );
        
        doc.autoTable({ startY: yPos, head: [['Parameter', 'Value']], body: geometryBody, theme: 'grid', headStyles: { fillColor: [22, 160, 133] }, styles: { fontSize: 9 }, columnStyles: { 0: { cellWidth: 100 } } });
        yPos = doc.autoTable.previous.finalY + 10;
        
        doc.setFontSize(12).setFont('helvetica', 'bold').text('1.2 Soil Profile', margin, yPos);
        toc.push({ title: '1.2 Soil Profile', page: doc.internal.getNumberOfPages(), level: 2 });
        yPos += 7;

        const soilHead = [['#', 'Short Name', 'Depth [m]', 'gamma,max', 'gamma,min', "gamma',max", "gamma',min", "phi' [deg]", "c' [kPa]"]];
        const soilBody = soilLayers.map((l, i) => [i + 1, l.name, l.depth.toFixed(1), l.gamma_max.toFixed(1), l.gamma_min.toFixed(1), l.gamma_prime_max.toFixed(1), l.gamma_prime_min.toFixed(1), l.phi.toFixed(1), l.c.toFixed(1)]);
        doc.autoTable({ startY: yPos, head: soilHead, body: soilBody, theme: 'grid', headStyles: { fillColor: [241, 196, 15] }, styles: { fontSize: 8, halign: 'center' } });
        
        pageDetails.yPos = doc.autoTable.previous.finalY + 10;

        // --- Results Section ---
        if (pageDetails.yPos + 20 > pageHeight - margin) { doc.addPage(); pageDetails.yPos = margin; }
        doc.setFontSize(16).setFont('helvetica', 'bold').text('2. Calculation Results', margin, pageDetails.yPos);
        toc.push({ title: '2. Calculation Results', page: doc.internal.getNumberOfPages(), level: 1 });
        pageDetails.yPos += 10;
        
        await addImageFromElement(doc, 'results-and-sketch', pageDetails, null, '2.1 Summary of Forces and Failure Sketch', 2);
        
        if (applySilo) {
            // Add Silo details as a subsection of 2.1
            await addImageFromElement(doc, 'silo-details-display-max', pageDetails, { widthFactor: 0.8 }, '2.1.1 Silo Theory Details (Vertical Stress Reduction)', 3);
        }

        await addImageFromElement(doc, 'slurry-penetration-results', pageDetails, null, '2.2 Slurry Penetration Analysis', 2);
        await addImageFromElement(doc, 'detailed-parameters', pageDetails, null, '2.3 Detailed Wedge Parameters at Critical Angle', 2);
        
        // --- Pressure Scenarios Section ---
        if (pageDetails.yPos + 20 > pageHeight - margin) { doc.addPage(); pageDetails.yPos = margin; }
        doc.setFontSize(16).setFont('helvetica', 'bold').text('3. Pressure Distribution Scenarios', margin, pageDetails.yPos);
        toc.push({ title: '3. Pressure Distribution Scenarios', page: doc.internal.getNumberOfPages(), level: 1 });
        pageDetails.yPos += 10;

        const activeTabEl = document.querySelector('[id^="tab-"][class*="border-blue-500"]');
        const originalTabName = activeTabEl ? activeTabEl.id.replace('tab-', '') : 'no-lowering';

        await addChartPaneToPdf(doc, pageDetails, 'no-lowering', 'pane-no-lowering', '3.1 Scenario: No Lowering (Full Slurry Face)');
        await addChartPaneToPdf(doc, pageDetails, 'full-lowering', 'pane-full-lowering', '3.2 Scenario: Full Lowering (Air Pressure)');
        await addChartPaneToPdf(doc, pageDetails, 'partial-lowering', 'pane-partial-lowering', '3.3 Scenario: Partial Lowering (Mixed Face)');
        
        // Restore the original active tab for a better user experience
        if (window.handleTabClick) {
            window.handleTabClick(originalTabName);
        }

        // --- Table of Contents Page ---
        const totalPages = doc.internal.getNumberOfPages();
        doc.insertPage(2);
        yPos = margin;
        doc.setFontSize(18).setFont('helvetica', 'bold').text('Table of Contents', margin, yPos);
        yPos += 15;
        doc.setFontSize(12).setFont('helvetica', 'normal');
        
        toc.forEach(item => {
            const indentation = '    '.repeat(item.level - 1);
            const leader = ".".repeat( Math.max(2, 75 - (item.title.length + indentation.length + String(item.page + 1).length)) );
            doc.text(`${indentation}${item.title} ${leader} ${item.page + 1}`, margin, yPos);
            yPos += 8;
            if (yPos > pageHeight - margin - 10) { doc.addPage(); yPos = margin; }
        });
        
        // --- Page Numbers ---
        for (let i = 1; i <= totalPages + 1; i++) {
            doc.setPage(i);
            doc.setFontSize(9).text(`Page ${i} of ${totalPages + 1}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        }

        const safeFileName = (crossSection && crossSection !== 'N/A') 
            ? `${crossSection.trim().replace(/[/\\?%*:|"<>]/g, '-')}.pdf` 
            : 'TBM_Support_Pressure_Report.pdf';
        doc.save(safeFileName);

    } catch (error) {
        console.error("PDF Generation Error:", error);
        showModal("Report Failed", "Could not generate the report. See browser console for details.");
    } finally {
        closeModal();
    }
}