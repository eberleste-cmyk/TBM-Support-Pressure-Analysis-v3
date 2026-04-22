export function showTab(tabName) {
    const panes = {
        'no-lowering': document.getElementById('pane-no-lowering'),
        'full-lowering': document.getElementById('pane-full-lowering'),
        'partial-lowering': document.getElementById('pane-partial-lowering')
    };
    const tabs = {
        'no-lowering': document.getElementById('tab-no-lowering'),
        'full-lowering': document.getElementById('tab-full-lowering'),
        'partial-lowering': document.getElementById('tab-partial-lowering')
    };

    for (const key in panes) {
        if (panes[key] && tabs[key]) {
            if (key === tabName) {
                panes[key].classList.remove('hidden');
                tabs[key].classList.add('border-blue-500', 'text-blue-600');
                tabs[key].classList.remove('border-transparent', 'text-gray-500');
            } else {
                panes[key].classList.add('hidden');
                tabs[key].classList.add('border-transparent', 'text-gray-500');
                tabs[key].classList.remove('border-blue-500', 'text-blue-600');
            }
        }
    }
}

export function showModal(title, message, showLoader = false) {
    const titleEl = document.getElementById('modalTitle');
    const msgEl = document.getElementById('modalMessage');
    const loader = document.getElementById('loader-container');
    const btn = document.getElementById('modal-close-button');
    const modal = document.getElementById('customModal');

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (loader) loader.style.display = showLoader ? 'flex' : 'none';
    if (btn) btn.style.display = showLoader ? 'none' : 'block';
    if (modal) modal.style.display = 'flex';
}

export function closeModal() {
    const modal = document.getElementById('customModal');
    if (modal) modal.style.display = 'none';
}

export function showBatchModal() {
    const modal = document.getElementById('batchModal');
    if (modal) modal.style.display = 'flex';
    document.getElementById('batch-status-text').textContent = 'Initializing...';
    document.getElementById('batch-percentage').textContent = '0%';
    document.getElementById('batch-progress-bar').style.width = '0%';
    document.getElementById('batch-log').innerHTML = '';
    document.getElementById('batch-cancel-button').classList.remove('hidden');
    document.getElementById('batch-done-button').classList.add('hidden');
}

export function updateBatchProgress(current, total, status, logMessage = null, isError = false) {
    if (current !== null && total !== null) {
        const percentage = Math.round((current / total) * 100);
        document.getElementById('batch-percentage').textContent = `${percentage}%`;
        document.getElementById('batch-progress-bar').style.width = `${percentage}%`;
    }
    if (status) document.getElementById('batch-status-text').textContent = status;
    
    if (logMessage) {
        const log = document.getElementById('batch-log');
        const entry = document.createElement('div');
        entry.className = isError ? 'text-red-500' : 'text-gray-600';
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${logMessage}`;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
    }
}

export function finishBatch(successCount, total) {
    document.getElementById('batch-status-text').textContent = 'Batch Completed';
    document.getElementById('batch-cancel-button').classList.add('hidden');
    document.getElementById('batch-done-button').classList.remove('hidden');
    
    const log = document.getElementById('batch-log');
    const summary = document.createElement('div');
    summary.className = 'font-bold mt-2 pt-2 border-t text-indigo-700';
    summary.textContent = `Batch Summary: ${successCount} of ${total} reports generated successfully.`;
    log.appendChild(summary);
    log.scrollTop = log.scrollHeight;
}

export function closeBatchModal() {
    const modal = document.getElementById('batchModal');
    if (modal) modal.style.display = 'none';
}

export function toggleSiloOptions() {
    const checkBox = document.getElementById('apply_silo');
    const options = document.getElementById('silo_options');
    if (checkBox && options) {
        options.style.display = checkBox.checked ? 'block' : 'none';
    }
}

export function renderLayers(soilLayers, updateFn, removeFn) {
    const container = document.getElementById('layer-profile');
    if (!container) return;
    container.innerHTML = '';
    
    soilLayers.forEach((layer, index) => {
        const tr = document.createElement('tr');
        tr.className = 'layer-input-row';
        tr.innerHTML = `
            <td class="py-2 px-2 text-center text-sm">${index + 1}</td>
            <td class="py-2 px-2"><input type="text" value="${layer.name}" onchange="updateLayerValue(${index}, 'name', this.value)" class="w-full p-1 border rounded text-sm" style="text-align: left;"></td>
            <td class="py-2 px-2"><input type="number" step="0.1" value="${layer.depth.toFixed(1)}" min="${index > 0 ? soilLayers[index - 1].depth + 0.1 : 0.1}" onchange="updateLayerValue(${index}, 'depth', this.value)" class="w-full p-1 border rounded text-sm"></td>
            <td class="py-2 px-2"><input type="number" step="0.1" value="${layer.gamma_max.toFixed(1)}" min="0" onchange="updateLayerValue(${index}, 'gamma_max', this.value)" class="w-full p-1 border rounded text-sm"></td>
            <td class="py-2 px-2"><input type="number" step="0.1" value="${layer.gamma_min.toFixed(1)}" min="0" onchange="updateLayerValue(${index}, 'gamma_min', this.value)" class="w-full p-1 border rounded text-sm"></td>
            <td class="py-2 px-2"><input type="number" step="0.1" value="${layer.gamma_prime_max.toFixed(1)}" min="0" onchange="updateLayerValue(${index}, 'gamma_prime_max', this.value)" class="w-full p-1 border rounded text-sm"></td>
            <td class="py-2 px-2"><input type="number" step="0.1" value="${layer.gamma_prime_min.toFixed(1)}" min="0" onchange="updateLayerValue(${index}, 'gamma_prime_min', this.value)" class="w-full p-1 border rounded text-sm"></td>
            <td class="py-2 px-2"><input type="number" step="0.1" value="${layer.phi.toFixed(1)}" min="0" max="90" onchange="updateLayerValue(${index}, 'phi', this.value)" class="w-full p-1 border rounded text-sm"></td>
            <td class="py-2 px-2"><input type="number" step="0.1" value="${layer.c.toFixed(1)}" min="0" onchange="updateLayerValue(${index}, 'c', this.value)" class="w-full p-1 border rounded text-sm"></td>
            <td class="py-2 px-2 text-center">
                <button onclick="removeLayer(${index})" class="text-red-600 hover:text-red-800 text-sm disabled:opacity-50" ${soilLayers.length === 1 ? 'disabled' : ''}>Remove</button>
            </td>
        `;
        container.appendChild(tr);
    });
}

export function renderDetailedTable(components, theta_crit, sideProps, baseProps) {
    const container = document.getElementById('parameter-detail-body');
    if (!container) return;
    if (!components) {
        container.innerHTML = '<tr><td colspan="3" class="p-3 text-center text-gray-500">Recalculate to see detailed parameters.</td></tr>';
        return;
    }
    container.innerHTML = [
        { param: 'Wedge Angle &vartheta;', value: `${theta_crit.toFixed(1)} \u00B0`, desc: 'Critical sliding angle' },
        { param: 'K\u2082 Value (from &varphi;\'_side)', value: components.K2.toFixed(3), desc: `Lateral pressure coeff. for T\u209a (using &varphi;'_side = ${components.phi_side.toFixed(1)})` },
        { param: 'P\u209a (Prism Load)', value: components.Pv.toFixed(2), desc: 'Destabilizing (Vertical Stress on Crown)' },
        { param: 'G (Wedge Weight)', value: components.G.toFixed(2), desc: `Destabilizing (from &gamma;'eff,av = ${sideProps ? sideProps.gamma_eff_av.toFixed(2) : 'N/A'})` },
        { param: 'Side Shear (Cohesion)', value: components.T_C.toFixed(2), desc: `Stabilizing (from c'_side = ${components.c_side.toFixed(1)})` },
        { param: 'Side Shear (Friction)', value: components.T_R.toFixed(2), desc: `Stabilizing (from &varphi;'_side = ${components.phi_side.toFixed(1)})` },
        { param: 'Base Shear (Cohesion)', value: components.C_base.toFixed(2), desc: `Stabilizing (from c'_base = ${components.c_base.toFixed(1)})` },
        { param: 'Base Friction (from &varphi;\'_base)', value: `${components.phi_base.toFixed(1)} \u00B0`, desc: 'Stabilizing (Used in N1 term)' },
        { param: 'E\u209a\u209a (\u03D1)', value: components.Ere.toFixed(2), desc: 'Required Earth Support Force E\u209a\u2090 (max)' }
    ].map(item => `<tr class="${item.param.includes('E\u209a\u209a') ? 'bg-red-50 font-bold' : 'hover:bg-gray-50'}">
        <td class="py-2 px-2">${item.param}</td>
        <td class="py-2 px-2 text-right">${item.value}</td>
        <td class="py-2 px-2 text-left text-gray-500 text-xs">${item.desc}</td></tr>`).join('');
}

// Helper to safely set text content of an element if it exists
function safeSetText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

export function drawWedgeSketch(D, t_crown, h_w, theta_crit, layers, apply_silo, siloResult, penetrationResult) {
    const canvas = document.getElementById('sketchCanvas');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const margin = { top: 30, right: 80, bottom: 30, left: 30 };
    const drawableWidth = width - margin.left - margin.right;
    const drawableHeight = height - margin.top - margin.bottom;

    ctx.clearRect(0, 0, width, height);

    if (D <= 0 || t_crown < 0) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#9ca3af';
        ctx.font = '12px sans-serif';
        ctx.fillText('Input valid geometry (D > 0, t_crown >= 0) to display sketch.', width / 2, height / 2);
        return;
    }

    const thetaRad = theta_crit * (Math.PI / 180);
    const wedgeWidth = (theta_crit > 1 && theta_crit < 89) ? D / Math.tan(thetaRad) : D;
    
    // Adjust scene max to include penetration if it's large
    let maxPen = 0;
    if (penetrationResult && penetrationResult.isPenetrationActive) {
        maxPen = Math.max(penetrationResult.e_max.crown, penetrationResult.e_max.axis, penetrationResult.e_max.invert);
    }
    
    const sceneXMin = -0.5 * D;
    const sceneXMax = Math.max(wedgeWidth, maxPen) * 1.1;
    const sceneWidth = sceneXMax - sceneXMin;
    const sceneYMax = (t_crown + D) * 1.1;
    // DYNAMIC SCENE BOUNDS: Start scene from water level if it's above ground.
    const sceneYMin = Math.min(0, h_w);
    const sceneHeight = sceneYMax - sceneYMin;

    if (sceneWidth <= 0 || sceneHeight <= 0) return;

    const scale = Math.min(drawableWidth / sceneWidth, drawableHeight / sceneHeight);
    const transform = (worldX, worldY) => ({
        x: margin.left + (worldX - sceneXMin) * scale,
        y: margin.top + (worldY - sceneYMin) * scale,
    });

    // 1. Draw Layers and GWT as the background
    ctx.save();
    ctx.rect(margin.left, margin.top, drawableWidth, drawableHeight);
    ctx.clip();

    const layerColors = ['#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280'];
    let currentDepth = 0;
    layers.forEach((layer, index) => {
        const p1_y = transform(0, currentDepth).y;
        const p2_y = transform(0, layer.depth).y;
        ctx.fillStyle = layerColors[index % layerColors.length];
        ctx.fillRect(margin.left, p1_y, drawableWidth, p2_y - p1_y);
        currentDepth = layer.depth;
    });
    const p_last_y = transform(0, currentDepth).y;
    if (p_last_y < margin.top + drawableHeight) {
        ctx.fillStyle = layerColors[layers.length % layerColors.length];
        ctx.fillRect(margin.left, p_last_y, drawableWidth, (margin.top + drawableHeight) - p_last_y);
    }

    // Draw GWT Line (now works for negative h_w, i.e., water above ground)
    const pGWT_y = transform(0, h_w).y;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(margin.left, pGWT_y);
    ctx.lineTo(margin.left + drawableWidth, pGWT_y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Draw layer names to the right of the sketch
    ctx.textAlign = 'left';
    ctx.fillStyle = 'black';
    ctx.font = 'bold 11px sans-serif';
    ctx.textBaseline = 'middle';
    let currentDepthForLabels = 0;
    layers.forEach((layer) => {
        const p1_y = transform(0, currentDepthForLabels).y;
        const p2_y = transform(0, layer.depth).y;
        const mid_y = (p1_y + p2_y) / 2;
        if (p2_y > p1_y && mid_y > margin.top && mid_y < (margin.top + drawableHeight)) {
            ctx.fillText(layer.name, margin.left + drawableWidth + 8, mid_y);
        }
        currentDepthForLabels = layer.depth;
    });

    // 2. Draw Silo Height visualization (now respects wedge width)
    if (apply_silo && siloResult && wedgeWidth > 0) {
        const { h1, h2 } = siloResult;
        const pSiloLeft = transform(0, 0);
        const pSiloRight = transform(wedgeWidth, 0);
        
        ctx.lineWidth = 1;
        ctx.font = 'bold 10px sans-serif';
        
        // Draw h2 (surcharge soil) if it exists
        if (h2 > 0) {
            const pSurchargeTop = transform(0, 0);
            const pSurchargeBottom = transform(0, h2);
            ctx.fillStyle = 'rgba(251, 146, 60, 0.2)'; // Light orange
            ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)';
            ctx.fillRect(pSiloLeft.x, pSurchargeTop.y, pSiloRight.x - pSiloLeft.x, pSurchargeBottom.y - pSurchargeTop.y);
            ctx.strokeRect(pSiloLeft.x, pSurchargeTop.y, pSiloRight.x - pSiloLeft.x, pSurchargeBottom.y - pSurchargeTop.y);
            ctx.fillStyle = '#d97706'; // Darker orange
            ctx.textAlign = 'left';
            ctx.fillText(`h₂ = ${h2.toFixed(1)}m`, pSiloLeft.x + 5, (pSurchargeTop.y + pSurchargeBottom.y) / 2);
        }
        
        // Draw h1 (effective silo)
        const pSiloTop = transform(0, h2);
        const pSiloBottom = transform(0, t_crown);
        ctx.fillStyle = 'rgba(74, 222, 128, 0.2)'; // Light green
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
        ctx.fillRect(pSiloLeft.x, pSiloTop.y, pSiloRight.x - pSiloLeft.x, pSiloBottom.y - pSiloTop.y);
        ctx.strokeRect(pSiloLeft.x, pSiloTop.y, pSiloRight.x - pSiloLeft.x, pSiloBottom.y - pSiloTop.y);
        ctx.fillStyle = '#16a34a'; // Darker green
        ctx.textAlign = 'left';
        ctx.fillText(`h₁ = ${h1.toFixed(1)}m`, pSiloLeft.x + 5, (pSiloTop.y + pSiloBottom.y) / 2);
    }


    // 3. Draw Failure Wedge (drawn after silo so it's on top)
    if (theta_crit > 1 && theta_crit < 89) {
        const pWedgeTip = transform(wedgeWidth, t_crown);
        const pPrismTopLeft = transform(0, 0);
        const pPrismTopRight = transform(wedgeWidth, 0);
        const pTunnelCrown = transform(0, t_crown);
        const pTunnelInvert = transform(0, t_crown + D);

        ctx.strokeStyle = 'rgba(220, 38, 38, 0.6)';
        ctx.lineWidth = 1;

        // Prism part (the rectangle above the tunnel crown)
        ctx.beginPath();
        ctx.moveTo(pPrismTopLeft.x, pPrismTopLeft.y);
        ctx.lineTo(pPrismTopRight.x, pPrismTopRight.y);
        ctx.lineTo(pWedgeTip.x, pWedgeTip.y);
        ctx.lineTo(pTunnelCrown.x, pTunnelCrown.y);
        ctx.closePath();
        
        // Conditionally fill the prism
        if (!apply_silo) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'; // Light red fill
            ctx.fill();
        }
        ctx.stroke(); // Always draw the outline of the prism.
        
        // Wedge part (the triangle below the crown)
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)'; // Slightly darker red fill for wedge
        ctx.beginPath();
        ctx.moveTo(pTunnelInvert.x, pTunnelInvert.y);
        ctx.lineTo(pTunnelCrown.x, pTunnelCrown.y);
        ctx.lineTo(pWedgeTip.x, pWedgeTip.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Sliding plane
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pTunnelInvert.x, pTunnelInvert.y);
        ctx.lineTo(pWedgeTip.x, pWedgeTip.y);
        ctx.stroke();
    }

    // 4. Draw Slurry Penetration Zone
    if (penetrationResult && penetrationResult.isPenetrationActive) {
        const { crown, axis, invert } = penetrationResult.e_max;
        const pCrown = transform(0, t_crown);
        const pAxis = transform(0, t_crown + D / 2);
        const pInvert = transform(0, t_crown + D);
        
        const pPenCrown = transform(crown, t_crown);
        const pPenAxis = transform(axis, t_crown + D / 2);
        const pPenInvert = transform(invert, t_crown + D);

        ctx.strokeStyle = 'rgb(139, 69, 19)'; // Brown (Earth Pressure Color)
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.moveTo(pPenCrown.x, pPenCrown.y);
        ctx.lineTo(pPenAxis.x, pPenAxis.y);
        ctx.lineTo(pPenInvert.x, pPenInvert.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Fill penetration zone
        ctx.fillStyle = 'rgba(139, 69, 19, 0.25)';
        ctx.beginPath();
        ctx.moveTo(pCrown.x, pCrown.y);
        ctx.lineTo(pPenCrown.x, pPenCrown.y);
        ctx.lineTo(pPenAxis.x, pPenAxis.y);
        ctx.lineTo(pPenInvert.x, pPenInvert.y);
        ctx.lineTo(pInvert.x, pInvert.y);
        ctx.closePath();
        ctx.fill();

        // Label penetration
        ctx.fillStyle = 'rgb(139, 69, 19)';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`e_max,c = ${crown.toFixed(2)}m`, pPenCrown.x + 5, pPenCrown.y);
        ctx.fillText(`e_max,i = ${invert.toFixed(2)}m`, pPenInvert.x + 5, pPenInvert.y);
    }

    // 5. Draw Tunnel (drawn last to be on top of everything)
    const pTunnelCrown = transform(0, t_crown);
    const pTunnelInvert = transform(0, t_crown + D);
    const pTunnelBody = transform(-D, t_crown);
    ctx.fillStyle = '#374151';
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.fillRect(pTunnelBody.x, pTunnelCrown.y, (pTunnelCrown.x - pTunnelBody.x), (pTunnelInvert.y - pTunnelCrown.y));
    ctx.strokeRect(pTunnelBody.x, pTunnelCrown.y, (pTunnelCrown.x - pTunnelBody.x), (pTunnelInvert.y - pTunnelCrown.y));
    ctx.beginPath();
    ctx.moveTo(pTunnelCrown.x, pTunnelCrown.y);
    ctx.lineTo(pTunnelInvert.x, pTunnelInvert.y);
    ctx.stroke();

    // 6. Draw Labels and Annotations
    ctx.fillStyle = '#000';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';

    const pSurface = transform(0, 0);
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin.left, pSurface.y);
    ctx.lineTo(margin.left + drawableWidth, pSurface.y);
    ctx.stroke();
    ctx.fillText('Ground Surface', width / 2, pSurface.y - 5);

    ctx.textAlign = 'right';
    ctx.beginPath();
    ctx.moveTo(pTunnelInvert.x + 10, pTunnelCrown.y);
    ctx.lineTo(pTunnelInvert.x + 10, pTunnelInvert.y);
    ctx.moveTo(pTunnelInvert.x + 8, pTunnelCrown.y);
    ctx.lineTo(pTunnelInvert.x + 12, pTunnelCrown.y);
    ctx.moveTo(pTunnelInvert.x + 8, pTunnelInvert.y);
    ctx.lineTo(pTunnelInvert.x + 12, pTunnelInvert.y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.save();
    ctx.translate(pTunnelInvert.x + 15, (pTunnelCrown.y + pTunnelInvert.y) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`D = ${D.toFixed(1)}m`, 0, 0);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.beginPath();
    ctx.moveTo(transform(0, 0).x, transform(0, 0).y);
    ctx.lineTo(pTunnelCrown.x, pTunnelCrown.y);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.setLineDash([2, 2]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText(`t_crown = ${t_crown.toFixed(1)}m`, pTunnelCrown.x - 30, (pTunnelCrown.y + transform(0,0).y)/2);

    if (theta_crit > 1 && theta_crit < 89) {
        ctx.textAlign = 'left';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`ϑ = ${theta_crit.toFixed(1)}°`, pTunnelInvert.x + 5, pTunnelInvert.y - 25);
    }
}


export function updateAveragePropertiesDisplay(sideProps, baseProps, sigma_v_prime_crown_max, sigma_v_prime_crown_min) {
    safeSetText('avg_gamma_eff', sideProps.gamma_eff_av.toFixed(2));
    safeSetText('avg_phi_side', sideProps.phi_side_av.toFixed(2));
    safeSetText('avg_c_side', sideProps.c_side_av.toFixed(2));
    safeSetText('avg_phi_base', baseProps.phi_base_av.toFixed(2));
    safeSetText('avg_c_base', baseProps.c_base_av.toFixed(2));
    safeSetText('sigma_prime_v_crown', sigma_v_prime_crown_max.toFixed(2));
    safeSetText('sigma_prime_v_crown_min', sigma_v_prime_crown_min.toFixed(2));
}

export function updateCriticalAngleDisplay(thetaCrit) {
    safeSetText('avg_theta_crit', thetaCrit.toFixed(1));
}

export function updateMainResults({ E_max_re, W_re, E_max_ci, W_ci, S_ci, D, thetaCrit }) {
    safeSetText('Emax_re', E_max_re.toFixed(2));
    safeSetText('Wre', W_re.toFixed(2));
    safeSetText('Emax_ci', E_max_ci.toFixed(2));
    safeSetText('Wci', W_ci.toFixed(2));
    safeSetText('Sci', S_ci.toFixed(2));
    safeSetText('theta_crit', thetaCrit.toFixed(1));
    safeSetText('faceArea', (D * D).toFixed(2));
    safeSetText('faceAreaCircular', ((Math.PI * D * D) / 4).toFixed(2));
}

export function updateSiloDetails(apply_silo, siloResult, sigma_v_prime_crown_max_no_silo, D, t_crown, soilLayers) {
    const siloDisplay = document.getElementById('silo-details-display-max');
    if (!siloDisplay) return;

    if (apply_silo && siloResult) {
        siloDisplay.innerHTML = ''; 
        const remainingLoad = sigma_v_prime_crown_max_no_silo > 1e-6 ? (siloResult.silo_sigma_prime_v / sigma_v_prime_crown_max_no_silo) * 100 : 0;
        
        // Use a grid layout: Left for text, Right for technical sketch
        const content = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div class="md:col-span-8 text-sm font-mono space-y-4">
                    <div>
                        <h3 class="font-bold text-gray-800 border-b border-gray-100 pb-1 mb-2">Silo Theory Calculation (DAUB 2005 - Infinite Strip)</h3>
                        <p class="font-bold text-blue-800">1. Silo Geometry (Terzaghi's b₁)</p>
                        <ul class="ml-4 space-y-1">
                            <li>Avg. Face Friction Angle (φ'<sub>face</sub>): ${siloResult.phi_for_b1.toFixed(1)} deg</li>
                            <li>Silo Half-Width (b₁): ${siloResult.B.toFixed(3)} m</li>
                            <li class="text-xs text-gray-500 italic">${siloResult.B_formula_str}</li>
                        </ul>
                    </div>
                    
                    <div>
                        <p class="font-bold text-blue-800">2. Silo Height Limit (DAUB Rec.)</p>
                        <ul class="ml-4 space-y-1">
                            <li>Total Overburden (t<sub>crown</sub>): ${t_crown} m</li>
                            <li>Silo Height Limit (5 x b₁): ${siloResult.h_limit.toFixed(2)} m</li>
                            <li class="text-green-700 font-bold">Effective Silo Height (h₁): ${siloResult.h1.toFixed(2)} m</li>
                            <li class="text-orange-700 font-bold">Surcharge Soil Height (h₂): ${siloResult.h2.toFixed(2)} m</li>
                        </ul>
                    </div>

                    <div>
                        <p class="font-bold text-blue-800">3. Janssen's Formula & Parameters</p>
                        <p class="text-[11px] text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 my-2">
                            σ'<sub>v</sub>(z) = [ (B·γ' - c') / λ ] · (1 - e<sup>-λ·z/B</sup>) + σ'<sub>s</sub>·e<sup>-λ·z/B</sup>
                            <span class="text-gray-400 italic block mt-1">where λ = K₁·tanφ'</span>
                        </p>
                        <div class="grid grid-cols-2 gap-4 text-xs bg-gray-50/50 p-2 rounded">
                            <ul class="space-y-0.5">
                                <li>B: ${siloResult.B.toFixed(3)} m</li>
                                <li>z (height h₁): ${siloResult.h1.toFixed(2)} m</li>
                                <li>σ'<sub>s</sub> (surcharge): ${siloResult.silo_surcharge.toFixed(2)} kN/m²</li>
                                <li>γ'<sub>eff</sub>: ${siloResult.avg_props.gamma_effective_av.toFixed(2)} kN/m³</li>
                            </ul>
                            <ul class="space-y-0.5">
                                <li>c': ${siloResult.avg_props.c_av.toFixed(2)} kN/m²</li>
                                <li>φ'<sub>silo</sub>: ${siloResult.avg_props.phi_av.toFixed(1)} deg</li>
                                <li>K₁: ${document.getElementById('silo_k1').value}</li>
                                <li>λ: ${siloResult.lambda.toFixed(3)}</li>
                            </ul>
                        </div>
                        <p class="text-[10px] text-gray-400 italic mt-1 text-center">Note: γ', c', and φ'<sub>silo</sub> are averaged over height h₁.</p>
                    </div>

                    <div class="pt-2 border-t-2 border-gray-100">
                        <p class="font-bold text-blue-800">4. Final Result</p>
                        <div class="flex justify-between items-baseline">
                            <span>Stress without Silo Effect:</span>
                            <span class="font-bold">${sigma_v_prime_crown_max_no_silo.toFixed(1)} kN/m²</span>
                        </div>
                        <div class="flex justify-between items-baseline text-lg">
                            <span>Stress with Silo Effect (σ'<sub>v,crown,max</sub>):</span>
                            <strong class="text-blue-700">${siloResult.silo_sigma_prime_v.toFixed(1)} kN/m²</strong>
                        </div>
                        <div class="flex justify-between items-baseline text-xs text-gray-500">
                            <span>Remaining Load:</span>
                            <span>${remainingLoad.toFixed(1)} %</span>
                        </div>
                    </div>
                </div>
                <div class="md:col-span-4 flex flex-col items-center justify-center p-2 bg-white rounded-lg border border-slate-200">
                    <canvas id="siloSketchCanvas" width="220" height="400" class="w-full"></canvas>
                    <p class="text-[9px] text-gray-400 mt-2 uppercase tracking-tight text-center">Technical Sketch: Silo Model (at scale)</p>
                </div>
            </div>`;

        siloDisplay.innerHTML = content;
        siloDisplay.classList.remove('hidden');

        // Draw the sketch after a small delay to ensure canvas is in DOM
        setTimeout(() => {
            const canvas = document.getElementById('siloSketchCanvas');
            if (canvas) drawSiloSketch(canvas, D, t_crown, parseFloat(document.getElementById('h_w').value), siloResult, soilLayers);
        }, 0);
    } else {
        siloDisplay.classList.add('hidden');
    }
}

export function drawSiloSketch(canvas, D, t_crown, h_w, siloResult, layers) {
    if (!canvas || !siloResult) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const margin = { top: 40, right: 30, bottom: 20, left: 30 };
    const drawableWidth = width - margin.left - margin.right;
    const drawableHeight = height - margin.top - margin.bottom;

    // Determine scale based on t_crown and D
    const worldYMin = -1; // Ground surface with buffer
    const worldYMax = t_crown + D + 1;
    const worldHeight = worldYMax - worldYMin;

    const b1 = siloResult.B;
    const worldXWidth = Math.max(b1 * 4, D * 2.5);
    const worldXMin = -worldXWidth / 2;

    const scaleY = drawableHeight / worldHeight;
    const scaleX = drawableWidth / worldXWidth;
    const scale = Math.min(scaleX, scaleY);
    
    const transform = (wx, wy) => ({
        x: margin.left + (wx - worldXMin) * scale,
        y: margin.top + (wy - worldYMin) * scale
    });

    // 1. Draw Layers (Background)
    ctx.save();
    ctx.rect(margin.left, margin.top, drawableWidth, drawableHeight);
    ctx.clip();
    const layerColors = ['#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af'];
    let currentDepth = 0;
    layers.forEach((layer, idx) => {
        const p1 = transform(0, currentDepth);
        const p2 = transform(0, layer.depth);
        ctx.fillStyle = layerColors[idx % layerColors.length];
        ctx.fillRect(margin.left, p1.y, drawableWidth, p2.y - p1.y);
        currentDepth = layer.depth;
    });
    ctx.restore();

    // 2. Main Geometry Points
    const r = D/2;
    const h1 = siloResult.h1;
    const h2 = siloResult.h2;
    const pCenter = transform(0, t_crown + r);
    const pGround = transform(0, 0);
    const pSiloTop = transform(0, h2);
    const pSiloBot = transform(0, h2 + h1);

    // Janssen Silo Rectangle
    const pLT = transform(-b1, h2);
    const pRT = transform(b1, h2);
    const pLB = transform(-b1, t_crown);
    const pRB = transform(b1, t_crown);

    // 3. Draw Silo Janssen Box
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 2]);
    ctx.strokeRect(pLT.x, pLT.y, pRT.x - pLT.x, pLB.y - pLT.y);
    ctx.setLineDash([]);

    // 4. Surcharge Box (if h2 exists)
    if (h2 > 0.01) {
        ctx.strokeStyle = '#92400e';
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(pLT.x, pGround.y, pRT.x - pLT.x, pLT.y - pGround.y);
        ctx.setLineDash([]);
    }

    // 5. Draw Tunnel
    ctx.beginPath();
    ctx.arc(pCenter.x, pCenter.y, r * scale, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 6. Draw Transition (Terzaghi ϑ lines)
    const phi = siloResult.phi_for_b1;
    const theta_rad = (45 + phi/2) * (Math.PI / 180);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.setLineDash([1, 1]);
    ctx.beginPath();
    ctx.moveTo(pLB.x, pLB.y);
    ctx.lineTo(pCenter.x - r * scale, pCenter.y);
    ctx.moveTo(pRB.x, pRB.y);
    ctx.lineTo(pCenter.x + r * scale, pCenter.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = 'italic 7px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.fillText(`ϑ = 45°+φ'/2`, pCenter.x + r*scale + 2, pCenter.y + 5);

    // 7. Layer Short Names (Left Side, vertically centered)
    ctx.textAlign = 'left';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    let currentDepthLabel = 0;
    layers.forEach(layer => {
        const thickness = layer.depth - currentDepthLabel;
        if (thickness >= 1.0) {
            const y1 = transform(0, currentDepthLabel).y;
            const y2 = transform(0, layer.depth).y;
            const midY = (y1 + y2) / 2;
            if (midY > margin.top && midY < height - margin.bottom) {
                // Use .name instead of .shortName
                ctx.fillText(layer.name || 'Layer', margin.left + 5, midY);
            }
        }
        currentDepthLabel = layer.depth;
    });

    // 8. Ground Line
    ctx.beginPath();
    ctx.moveTo(margin.left - 5, pGround.y);
    ctx.lineTo(width - margin.right + 5, pGround.y);
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#4b5563';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GROUND SURFACE', width/2, pGround.y - 12);

    // 9. Dimension Lines
    const drawDim = (x, y1, y2, label, color) => {
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y1); ctx.lineTo(x, y2);
        ctx.moveTo(x-3, y1); ctx.lineTo(x+3, y1);
        ctx.moveTo(x-3, y2); ctx.lineTo(x+3, y2);
        ctx.stroke();
        ctx.save();
        ctx.translate(x + 10, (y1 + y2) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText(label, 0, 0);
        ctx.restore();
    };

    // h1
    drawDim(pRT.x + 10, pSiloTop.y, pRB.y, `h₁ = ${h1.toFixed(1)}m`, '#15803d');
    // h2
    if (h2 > 0.01) {
        drawDim(pRT.x + 35, pGround.y, pSiloTop.y, `h₂ = ${h2.toFixed(1)}m`, '#92400e');
    }
    
    // 2b1 - RELOCATED HIGHER ABOVE CROWN
    const yDim2b1 = pLB.y - 45;
    ctx.strokeStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.moveTo(pLT.x, yDim2b1); ctx.lineTo(pRT.x, yDim2b1);
    ctx.moveTo(pLT.x, yDim2b1 - 3); ctx.lineTo(pLT.x, yDim2b1 + 3);
    ctx.moveTo(pRT.x, yDim2b1 - 3); ctx.lineTo(pRT.x, yDim2b1 + 3);
    ctx.stroke();
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`2 b₁ = ${(2 * b1).toFixed(2)}m`, pCenter.x, yDim2b1 - 5);

    // 10. Force Arrows
    const drawArrows = (y, xStart, xEnd, label, color) => {
        const step = (xEnd - xStart) / 4;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const x = xStart + i * step;
            ctx.beginPath();
            ctx.moveTo(x, y-10); ctx.lineTo(x, y);
            ctx.lineTo(x-2, y-3); ctx.moveTo(x, y); ctx.lineTo(x+2, y-3);
            ctx.stroke();
        }
        ctx.fillStyle = color;
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, (xStart + xEnd)/2, y - 15);
    };

    drawArrows(pGround.y, pLT.x, pRT.x, 'p', '#475569');
    if (h2 > 0) drawArrows(pSiloTop.y, pLT.x, pRT.x, 'p+h₂·γ', '#92400e');
    // sigma_v arrows above crown
    drawArrows(pLB.y, pLT.x, pRT.x, "σ'v", '#1d4ed8');
}


function updateIngressCheck(prefix, checkData) {
    safeSetText(`ingress_s_${prefix}_provided`, checkData.min_pressure.toFixed(2));
    safeSetText(`ingress_p_water_req_${prefix}`, checkData.required.toFixed(2));
    safeSetText(`ingress_p_water_unfactored_${prefix}`, checkData.unfactored_water.toFixed(2));
    
    const eta = (checkData.required > 1e-6) ? (checkData.min_pressure / checkData.required) : Infinity;
    const eta_text = (eta === Infinity) ? 'Inf.' : `η = ${eta.toFixed(2)}`;
    const statusBox = document.getElementById(`ingress_status_box_${prefix}`);
    
    if (statusBox) {
        const firstP = statusBox.querySelector('p');
        if (firstP) firstP.textContent = 'Safety Factor (η)';
        safeSetText(`ingress_status_${prefix}`, eta_text);
        
        statusBox.classList.toggle('bg-green-200', eta >= 1.0);
        statusBox.classList.toggle('text-green-800', eta >= 1.0);
        statusBox.classList.toggle('bg-red-200', eta < 1.0);
        statusBox.classList.toggle('text-red-800', eta < 1.0);
    }
}

export function updatePressureScenario_NoLowering(results) {
    safeSetText('s_crown_min_display', results.s_crown_min.toFixed(2));
    safeSetText('s_crown_adv_min_display', results.s_crown_advance_min.toFixed(2));
    
    const subtitleEl = document.getElementById('no-lowering-subtitle');
    if (subtitleEl) {
        if (Math.abs(results.s_crown_min - results.s_crown_min_stability) < 0.01) {
            subtitleEl.innerHTML = `Pressure governed by overall stability (S<sub>ci</sub>).<br>Req. s<sub>crown,min</sub> for stability = ${results.s_crown_min_stability.toFixed(2)} kN/m&sup2;.`;
        } else if (Math.abs(results.s_crown_min - results.s_crown_min_water_invert) < 0.01) {
            subtitleEl.innerHTML = `Pressure governed by water ingress check at invert.<br>Req. s<sub>crown,min</sub> for stability = ${results.s_crown_min_stability.toFixed(2)}; for water ingress = ${results.s_crown_min_water_invert.toFixed(2)} kN/m&sup2;.`;
        } else {
            subtitleEl.innerHTML = `Pressure governed by water ingress check at crown.<br>Req. s<sub>crown,min</sub> for stability = ${results.s_crown_min_stability.toFixed(2)}; for water ingress = ${results.s_crown_min_water_crown.toFixed(2)} kN/m&sup2;.`;
        }
    }

    updateIngressCheck('crown', results.ingress_check_crown);
    updateIngressCheck('invert', { ...results.ingress_check, min_pressure: results.distribution.pressures_S_min.slice(-1)[0] });
}

export function getPartialLoweringInputs() {
    const levelEl = document.getElementById('slurry_level_partial');
    const gammaEl = document.getElementById('gamma_S_partial');
    return {
        slurry_level_partial: levelEl ? parseFloat(levelEl.value) / 100 : 0.5,
        gamma_S_partial: gammaEl ? parseFloat(gammaEl.value) : 11.5,
    };
}

export function updateSlurryPenetrationResults(fs0, efficiency, isActive, isOverrideActive, S_ci_req, S_ci_adj, stabilityCheck, penetrationResult, emaxProposal) {
    safeSetText('fs0_display', fs0.toFixed(1));
    
    const efficiencyDisplay = document.getElementById('efficiency_display');
    const efficiencyBox = document.getElementById('efficiency_box');
    const efficiencyWarning = document.getElementById('efficiency-warning-alert');
    const efficiencyContainer = efficiencyDisplay ? efficiencyDisplay.parentElement : null;
    const noteEl = document.getElementById('penetration-note');
    const verificationBlock = document.getElementById('slurry-verification-block');
    const equationEl = document.getElementById('verification-equation');
    const statusEl = document.getElementById('verification-status');
    const efficiencyDetails = document.getElementById('efficiency-details');
    const mirrorEl = document.getElementById('emax_ci_mirror');
    const proposalWrapper = document.getElementById('emax_proposal_wrapper');
    const overrideContainer = document.getElementById('emax_override_container');

    // Handle Warnings and Highlights for Reduced Efficiency without override
    const hasReduction = efficiency < 0.9999;
    if (hasReduction && !isOverrideActive) {
        if (efficiencyWarning) efficiencyWarning.classList.remove('hidden');
        if (efficiencyBox) {
            efficiencyBox.classList.add('bg-red-50', 'border-red-300', 'ring-1', 'ring-red-200');
            efficiencyBox.classList.remove('bg-[#8B4513]/5', 'border-[#8B4513]/20');
        }
    } else {
        if (efficiencyWarning) efficiencyWarning.classList.add('hidden');
        if (efficiencyBox) {
            efficiencyBox.classList.remove('bg-red-50', 'border-red-300', 'ring-1', 'ring-red-200');
            efficiencyBox.classList.add('bg-[#8B4513]/5', 'border-[#8B4513]/20');
        }
    }
    
    // Handle Emax Proposal Link and Highlight
    if (emaxProposal !== null && efficiency < 0.999) {
        if (proposalWrapper) {
            proposalWrapper.classList.remove('hidden');
            safeSetText('emax_proposal_val', emaxProposal.toFixed(0));
        }
        if (overrideContainer) {
            overrideContainer.classList.add('ring-2', 'ring-orange-400/50', 'bg-orange-50');
            overrideContainer.classList.remove('bg-gray-50');
        }
    } else {
        if (proposalWrapper) proposalWrapper.classList.add('hidden');
        if (overrideContainer) {
            overrideContainer.classList.remove('ring-2', 'ring-orange-400/50', 'bg-orange-50');
            overrideContainer.classList.add('bg-gray-50');
        }
    }

    // Sync mirror div for PDF reports
    if (mirrorEl) {
        const inputObj = document.getElementById('emax_ci_override');
        const inputVal = inputObj.value;
        
        if (inputVal) {
            mirrorEl.textContent = inputVal;
            mirrorEl.classList.add('font-bold', 'text-[#8B4513]');
            mirrorEl.classList.remove('text-gray-400', 'italic');
        } else {
            mirrorEl.textContent = inputObj.placeholder || 'Calculated value used if empty';
            mirrorEl.classList.remove('font-bold', 'text-[#8B4513]');
            mirrorEl.classList.add('text-gray-400', 'italic');
        }
    }
    
    if (isActive) {
        safeSetText('efficiency_display', (efficiency * 100).toFixed(1));
        if (efficiencyContainer) efficiencyContainer.style.opacity = '1';
        if (noteEl) {
            noteEl.innerHTML = 'Note: Penetration model active (f<sub>s0</sub> &lt; 200 kN/m³).';
            noteEl.className = 'text-[10px] text-[#8B4513] mt-2 italic font-semibold';
        }

        // Show intermediate results
        if (efficiencyDetails && penetrationResult) {
            efficiencyDetails.classList.remove('hidden');
            safeSetText('wedge_b_display', penetrationResult.wedge_b.toFixed(2));
            safeSetText('coord_x_display', penetrationResult.coord_x.toFixed(3));
            safeSetText('dp_x_display', penetrationResult.dp_x.toFixed(1));
            safeSetText('emax_x_display', penetrationResult.emax_x.toFixed(3));
            safeSetText('area_bb_display', penetrationResult.BB.toFixed(3));
            safeSetText('area_aa_display', penetrationResult.AA.toFixed(3));
            safeSetText('ratio_aabb_display', (penetrationResult.earthEfficiency * 100).toFixed(1));
        }
    } else {
        safeSetText('efficiency_display', '100.0');
        if (efficiencyContainer) efficiencyContainer.style.opacity = '0.5';
        if (noteEl) {
            noteEl.innerHTML = 'Note: Membrane model active (f<sub>s0</sub> &ge; 200 kN/m³). Efficiency is 100%.';
            noteEl.className = 'text-[10px] text-gray-500 mt-2 italic';
        }
        if (efficiencyDetails) efficiencyDetails.classList.add('hidden');
    }

    // Verification Logic (Force Transfer)
    if (isOverrideActive && isActive) {
        if (verificationBlock) verificationBlock.classList.remove('hidden');
        
        const S_ci_eff = S_ci_adj * efficiency;
        const isPassed = S_ci_eff >= S_ci_req;
        
        if (equationEl) {
            equationEl.innerHTML = `
                <div class="flex flex-col space-y-1">
                    <div class="flex justify-between"><span>S<sub>ci,req</sub>:</span> <span>${S_ci_req.toFixed(0)} kN</span></div>
                    <div class="flex justify-between"><span>S<sub>ci,adj</sub>:</span> <span>${S_ci_adj.toFixed(0)} kN</span></div>
                    <div class="flex justify-between border-t border-gray-300 pt-1"><span>S<sub>ci,eff</sub>:</span> <span>${S_ci_adj.toFixed(0)} × ${efficiency.toFixed(3)} = <span class="font-bold">${S_ci_eff.toFixed(0)} kN</span></span></div>
                </div>
            `;
        }
        
        if (statusEl) {
            statusEl.textContent = isPassed ? `Verification: OK (S_eff ≥ S_req)` : `Verification: INSUFFICIENT (S_eff < S_req)`;
            statusEl.className = `mt-3 text-[10px] font-bold uppercase tracking-widest text-center py-2 rounded ${isPassed ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`;
        }
    } else {
        if (verificationBlock) verificationBlock.classList.add('hidden');
    }

    // Stability Check Logic (DAUB Eq. 3)
    if (stabilityCheck) {
        safeSetText('tau_f_req_display', stabilityCheck.tau_f_req_nm2.toFixed(2) + ' N/m²');
        safeSetText('tau_f_provided_display', stabilityCheck.tau_f_provided_nm2.toFixed(2) + ' N/m²');
        
        const stabilityStatusEl = document.getElementById('stability-check-status');
        if (stabilityStatusEl) {
            stabilityStatusEl.textContent = stabilityCheck.passed ? 'Status: OK' : 'Status: WARNING (Insufficient Yield Point)';
            stabilityStatusEl.className = `mt-4 p-2 rounded text-center font-bold uppercase tracking-widest ${stabilityCheck.passed ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`;
        }
    }
}

export function updateBlowoutCheck(scenario, results) {
    const prefix = scenario === 'no-lowering' ? '' : `_${scenario.replace(/-/g, '_')}`;
    safeSetText(`blowout_s_crown_req${prefix}`, results.pressure_for_proof.toFixed(2));
    safeSetText(`blowout_s_crown_max${prefix}`, results.s_crown_max_allowable.toFixed(2));
    safeSetText(`blowout_eta${prefix}`, `η = ${results.eta.toFixed(2)}`);
    safeSetText(`sigma_v_crown_min_info${prefix}`, results.sigma_v_crown_min.toFixed(2));
    
    const statusBox = document.getElementById(`blowout_status_box${prefix}`);
    if (statusBox) {
        statusBox.classList.toggle('bg-green-200', results.passed);
        statusBox.classList.toggle('text-green-800', results.passed);
        statusBox.classList.toggle('bg-red-200', !results.passed);
        statusBox.classList.toggle('text-red-800', !results.passed);
    }
}

export function updatePressureScenario_FullLowering(results) {
    safeSetText('s_air_req_full_display', results.s_air_adv.toFixed(2));
    
    const subtitleEl = document.getElementById('full-lowering-subtitle');
    if (subtitleEl) {
        if (Math.abs(results.s_air_min - results.s_air_min_stability) < 0.01) {
            subtitleEl.innerHTML = `Pressure governed by overall stability (S<sub>ci</sub>).<br>Req. s<sub>air,min</sub> for stability = ${results.s_air_min_stability.toFixed(2)} kN/m&sup2;.`;
        } else {
            subtitleEl.innerHTML = `Pressure governed by water ingress check at invert.<br>Req. s<sub>air,min</sub> for water ingress = ${results.s_air_min_water_invert.toFixed(2)} kN/m&sup2;.`;
        }
    }
    
    // Ingress checks are custom for constant pressure
    const { p_water_unfactored } = results.distribution;
    const etaWEl = document.getElementById('eta_W');
    const eta_W = etaWEl ? parseFloat(etaWEl.value) : 1.05;

    updateIngressCheck('crown_full_lowering', { required: p_water_unfactored[0] * eta_W, unfactored_water: p_water_unfactored[0], min_pressure: results.s_air_min });
    updateIngressCheck('full_lowering', { required: p_water_unfactored.slice(-1)[0] * eta_W, unfactored_water: p_water_unfactored.slice(-1)[0], min_pressure: results.s_air_min });
}

export function updatePressureScenario_PartialLowering(results) {
    safeSetText('s_air_req_partial_display', results.s_air_adv.toFixed(2));
    
    const subtitleEl = document.getElementById('partial-lowering-subtitle');
    if (subtitleEl) {
        const diffInvert = Math.abs(results.s_air_min - results.s_air_min_water_invert);
        const diffInterface = Math.abs(results.s_air_min - results.s_air_min_water_interface);
        const diffStability = Math.abs(results.s_air_min - results.s_air_min_stability);

        if (diffInterface < 0.01) {
            subtitleEl.innerHTML = `Air pressure governed by water ingress check at lowering point.<br>Req. s<sub>air,min</sub> for water ingress = ${results.s_air_min_water_interface.toFixed(2)} kN/m&sup2;.`;
        } else if (diffInvert < 0.01) {
            subtitleEl.innerHTML = `Air pressure governed by water ingress check at invert.<br>Req. s<sub>air,min</sub> for water ingress = ${results.s_air_min_water_invert.toFixed(2)} kN/m&sup2;.`;
        } else if (diffStability < 0.01) {
            subtitleEl.innerHTML = `Air pressure governed by stability (S<sub>ci</sub>).<br>Req. s<sub>air,min</sub> for stability = ${results.s_air_min_stability.toFixed(2)} kN/m&sup2;.`;
        } else {
            subtitleEl.innerHTML = `Air pressure governed by minimum non-negative pressure.`;
        }
    }

    // Ingress checks are custom for mixed pressure
    const { p_water_unfactored, p_support_min } = results.distribution;
    const etaWEl = document.getElementById('eta_W');
    const eta_W = etaWEl ? parseFloat(etaWEl.value) : 1.05;

    updateIngressCheck('crown_partial_lowering', { required: p_water_unfactored[0] * eta_W, unfactored_water: p_water_unfactored[0], min_pressure: p_support_min[0] });
    
    // Lowering Point Check
    updateIngressCheck('lowering_point_partial_lowering', { 
        required: results.p_water_interface_unfactored * eta_W, 
        unfactored_water: results.p_water_interface_unfactored, 
        min_pressure: results.s_air_min 
    });

    updateIngressCheck('partial_lowering', { required: p_water_unfactored.slice(-1)[0] * eta_W, unfactored_water: p_water_unfactored.slice(-1)[0], min_pressure: p_support_min.slice(-1)[0] });
}