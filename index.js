import * as calc from './calculations.js';
import * as ui from './ui.js';
import * as charts from './charts.js';
import * as data from './data.js';
import * as report from './report.js';

// --- STATE MANAGEMENT ---
let soilLayers = [
    { name: 'Sand', depth: 5, gamma_max: 18, gamma_min: 17, gamma_prime_max: 8, gamma_prime_min: 7, phi: 30, c: 0 },
    { name: 'Clay', depth: 15, gamma_max: 19, gamma_min: 18, gamma_prime_max: 9, gamma_prime_min: 8, phi: 32, c: 5 },
    { name: 'Rock', depth: 30, gamma_max: 20, gamma_min: 19, gamma_prime_max: 10, gamma_prime_min: 9, phi: 35, c: 10 }
];
let globalThetaCrit = 66.56;
let chartInstances = {
    ere: null,
    pressure: null,
    pressureFull: null,
    pressurePartial: null
};
let chartDataStore = {}; // Holds calculated data for charts


// --- LAYER DATA MANAGEMENT ---
function updateLayerValue(index, key, value) {
    if (key === 'name') {
        soilLayers[index][key] = value;
        rerenderLayers(); // Rerender to update sketch with new name
        return;
    }
    const parsedValue = parseFloat(value);
    if (!isNaN(parsedValue) && parsedValue >= 0) {
        soilLayers[index][key] = parsedValue;
        if (key === 'depth' && index < soilLayers.length - 1 && parsedValue >= soilLayers[index + 1].depth) {
            soilLayers[index + 1].depth = parsedValue + 0.1;
        }
        rerenderLayers();
    } else {
        rerenderLayers();
    }
}

function addLayer() {
    const lastLayer = soilLayers[soilLayers.length - 1] || { name: 'Layer 0', depth: 0, gamma_max: 18, gamma_min: 17, gamma_prime_max: 8, gamma_prime_min: 7, phi: 30, c: 0 };
    soilLayers.push({
        name: 'New Layer',
        depth: lastLayer.depth + 5,
        gamma_max: lastLayer.gamma_max,
        gamma_min: lastLayer.gamma_min,
        gamma_prime_max: lastLayer.gamma_prime_max,
        gamma_prime_min: lastLayer.gamma_prime_min,
        phi: lastLayer.phi,
        c: lastLayer.c
    });
    rerenderLayers();
}

function removeLayer(index) {
    if (soilLayers.length > 1) {
        soilLayers.splice(index, 1);
        rerenderLayers();
    }
}

function rerenderLayers() {
    ui.renderLayers(soilLayers, updateLayerValue, removeLayer);
    updatePlot();
}


// --- CHART RENDERING LOGIC ---
function renderActiveChart() {
    const noLoweringPane = document.getElementById('pane-no-lowering');
    const fullLoweringPane = document.getElementById('pane-full-lowering');
    const partialLoweringPane = document.getElementById('pane-partial-lowering');

    if (noLoweringPane && !noLoweringPane.classList.contains('hidden') && chartDataStore.noLowering) {
        chartInstances.pressure = charts.renderPressureChart(document.getElementById('PressureChart').getContext('2d'), chartInstances.pressure, chartDataStore.noLowering);
    }
    if (fullLoweringPane && !fullLoweringPane.classList.contains('hidden') && chartDataStore.fullLowering) {
        chartInstances.pressureFull = charts.renderPressureChartFullLowering(document.getElementById('PressureChartFullLowering').getContext('2d'), chartInstances.pressureFull, chartDataStore.fullLowering);
    }
    if (partialLoweringPane && !partialLoweringPane.classList.contains('hidden') && chartDataStore.partialLowering) {
        chartInstances.pressurePartial = charts.renderPressureChartPartialLowering(document.getElementById('PressureChartPartialLowering').getContext('2d'), chartInstances.pressurePartial, chartDataStore.partialLowering);
    }
}


// --- MAIN CALCULATION & UPDATE FLOW ---
function updatePlot() {
    // 1. Get Inputs
    const D = parseFloat(document.getElementById('D').value) || 0;
    const t_crown = parseFloat(document.getElementById('t_crown').value) || 0;
    const sigma_s_p = parseFloat(document.getElementById('sigma_s_p').value) || 0;
    const sigma_s_t = parseFloat(document.getElementById('sigma_s_t').value) || 0;
    const sigma_s_total = sigma_s_p + sigma_s_t;
    const h_w = parseFloat(document.getElementById('h_w').value) || 0;
    const gamma_S = parseFloat(document.getElementById('gamma_S').value) || 10.0;
    const eta_E = parseFloat(document.getElementById('eta_E').value) || 1.5;
    const eta_W = parseFloat(document.getElementById('eta_W').value) || 1.05;
    const k2_model = document.getElementById('k2_model').value;
    const sigma_v_model = document.getElementById('sigma_v_model').value;
    const delta_P = parseFloat(document.getElementById('delta_P').value) || 0;
    const apply_silo = document.getElementById('apply_silo').checked;
    const silo_k1 = parseFloat(document.getElementById('silo_k1').value) || 0.8;
    const d10 = parseFloat(document.getElementById('d10').value) || 0.15;
    const tau_f = parseFloat(document.getElementById('tau_f').value) || 30;

    // 2. Geotechnical Calculations
    const sideProps = calc.calculateWedgeAverages(t_crown, D, h_w, soilLayers);
    const baseProps = calc.calculatePrismAverages(t_crown, D, h_w, soilLayers);

    const sigma_v_prime_crown_max_no_silo = calc.calculateSigmaVPrime(t_crown, sigma_s_total, h_w, soilLayers, false);
    let sigma_v_prime_crown_max_final = sigma_v_prime_crown_max_no_silo;
    
    let siloResult = null;
    if (apply_silo) {
        siloResult = calc.calculateSiloSigmaV(t_crown, sigma_s_total, h_w, soilLayers, D, silo_k1, false);
        sigma_v_prime_crown_max_final = siloResult.silo_sigma_prime_v;
    }
    
    const sigma_v_prime_crown_min = calc.calculateSigmaVPrime(t_crown, sigma_s_p, h_w, soilLayers, true);

    ui.updateAveragePropertiesDisplay(sideProps, baseProps, sigma_v_prime_crown_max_final, sigma_v_prime_crown_min);
    ui.updateSiloDetails(apply_silo, siloResult, sigma_v_prime_crown_max_no_silo);

    if (D <= 0) {
        ui.drawWedgeSketch(D, t_crown, h_w, 0, soilLayers, false, null); // Draw with a clear message
        return;
    }

    // 4. E_re(theta) Calculation & Find Critical Angle
    const ereData = [];
    let maxEre = 0;
    let thetaCrit = 0;
    for (let theta = 1; theta < 90; theta += 0.1) {
        const components = calc.calculateEreComponents(D, sigma_v_prime_crown_max_final, theta, sideProps, baseProps, k2_model, sigma_v_model);
        const ere = components ? components.Ere : 0;
        const roundedTheta = Math.round(theta * 10) / 10;
        ereData.push({ x: roundedTheta, y: ere });
        if (ere > maxEre) { 
            maxEre = ere; 
            thetaCrit = roundedTheta; 
        }
    }
    globalThetaCrit = thetaCrit; // Update global state
    ui.updateCriticalAngleDisplay(thetaCrit);

    // 5. Final Force Calculations
    const E_max_re = maxEre;
    const circularFaceFactor = Math.PI / 4;
    const E_max_ci_calc = E_max_re * circularFaceFactor;

    // --- OVERRIDE LOGIC ---
    const emax_ci_override_input = document.getElementById('emax_ci_override');
    const emax_ci_override_val = parseFloat(emax_ci_override_input.value);
    let E_max_ci_final = E_max_ci_calc;
    const isOverrideActive = !isNaN(emax_ci_override_val) && emax_ci_override_val > 0;

    if (isOverrideActive) {
        E_max_ci_final = emax_ci_override_val;
        emax_ci_override_input.classList.add('bg-[#8B4513]/5', 'border-[#8B4513]/40', 'font-bold', 'text-[#8B4513]');
    } else {
        emax_ci_override_input.classList.remove('bg-[#8B4513]/5', 'border-[#8B4513]/40', 'font-bold', 'text-[#8B4513]');
    }

    const W_re = (h_w > t_crown) ? 0 : calc.calculateWre(D, t_crown, h_w);
    const W_ci = (h_w > t_crown) ? calc.calculateWaterForceCircular(D, t_crown, h_w) : W_re * circularFaceFactor;

    // Original Required Force (Geotechnical)
    const S_ci_calc = (eta_E * E_max_ci_calc) + (eta_W * W_ci);

    // Final Force (with potential override)
    const S_ci_final = (eta_E * E_max_ci_final) + (eta_W * W_ci);

    // Slurry Penetration Logic (Step 2 implementation)
    // We need S_ci_final to calculate s_crown_min first
    const A_ci = (Math.PI * D * D) / 4;
    const s_crown_min_stability = (A_ci > 0) ? (S_ci_final / A_ci) - (gamma_S * (D / 2)) : 0;
    const p_water_crown = Math.max(0, t_crown - h_w) * calc.GAMMA_W;
    const s_crown_min_water_crown = p_water_crown * eta_W;
    const p_water_invert = Math.max(0, (t_crown + D) - h_w) * calc.GAMMA_W;
    const s_crown_min_water_invert = (p_water_invert * eta_W) - (gamma_S * D);
    const s_crown_min = Math.max(s_crown_min_stability, s_crown_min_water_crown, s_crown_min_water_invert);

    const penetrationResult = calc.calculateSlurryPenetration(D, t_crown, h_w, gamma_S, s_crown_min, d10, tau_f, thetaCrit, eta_E, E_max_ci_final, eta_W, W_ci, S_ci_final);
    
    // --- PROPOSAL LOGIC ---
    let emaxProposal = null;
    if (penetrationResult.isPenetrationActive && penetrationResult.efficiency < 0.999) {
        // Goal Seek: Find E_max_ci such that S_ci_eff = 100.1% of S_ci_calc
        const target = S_ci_calc * 1.001;
        const low = E_max_ci_calc;
        const high = E_max_ci_calc * 2.0;

        const checkResult = (testE) => {
            const testS_ci_adj = (eta_E * testE) + (eta_W * W_ci);
            const test_s_crown_min_stability = (A_ci > 0) ? (testS_ci_adj / A_ci) - (gamma_S * (D / 2)) : 0;
            const test_s_crown_min = Math.max(test_s_crown_min_stability, s_crown_min_water_crown, s_crown_min_water_invert);
            const testPen = calc.calculateSlurryPenetration(D, t_crown, h_w, gamma_S, test_s_crown_min, d10, tau_f, thetaCrit, eta_E, testE, eta_W, W_ci, testS_ci_adj);
            return (testS_ci_adj * testPen.efficiency) - target;
        };

        // Bisection method
        let a = low;
        let b = high;
        if (checkResult(b) > 0) {
            for (let i = 0; i < 20; i++) {
                const mid = (a + b) / 2;
                if (checkResult(mid) > 0) b = mid;
                else a = mid;
            }
            emaxProposal = b;
        }
    }

    // Slurry Stability Check (DAUB Eq. 3)
    const stabilityCheck = calc.calculateSlurryStabilityCheck(d10, tau_f, baseProps.phi_base_av, sideProps.gamma_eff_av);
    
    ui.updateSlurryPenetrationResults(
        penetrationResult.fs0, 
        penetrationResult.efficiency, 
        penetrationResult.isPenetrationActive, 
        isOverrideActive, 
        S_ci_calc, 
        S_ci_final,
        stabilityCheck,
        penetrationResult,
        emaxProposal
    );

    const criticalComponents = calc.calculateEreComponents(D, sigma_v_prime_crown_max_final, thetaCrit, sideProps, baseProps, k2_model, sigma_v_model);

    // 6. Update UI with main results - ALWAYS SHOW ORIGINAL VALUES IN MAIN PANEL
    ui.updateMainResults({ E_max_re, W_re, E_max_ci: E_max_ci_calc, W_ci, S_ci: S_ci_calc, D, thetaCrit });
    ui.renderDetailedTable(criticalComponents, thetaCrit, sideProps, baseProps);
    
    // 7. Pressure Distribution Scenarios & Data Storage - USE FINAL VALUES FOR SCENARIOS
    // Scenario 1: No Lowering
    const pressureResults = calc.calculatePressureDistribution(D, t_crown, h_w, gamma_S, S_ci_final, eta_E, eta_W, E_max_ci_final, delta_P);
    ui.updatePressureScenario_NoLowering(pressureResults);
    const blowoutResults = calc.calculateBlowoutSafety_DAUB(t_crown, sigma_v_prime_crown_min, h_w, pressureResults.s_crown_advance_min, delta_P);
    ui.updateBlowoutCheck('no-lowering', blowoutResults);
    chartDataStore.noLowering = pressureResults.distribution;

    // Scenario 2: Full Lowering
    const fullLoweringResults = calc.calculatePressureDistribution_FullLowering(D, t_crown, h_w, E_max_ci_calc, S_ci_calc, eta_W, delta_P, (Math.PI * D * D) / 4);
    ui.updatePressureScenario_FullLowering(fullLoweringResults);
    const blowoutResultsFull = calc.calculateBlowoutSafety_DAUB(t_crown, sigma_v_prime_crown_min, h_w, fullLoweringResults.s_air_adv, delta_P);
    ui.updateBlowoutCheck('full-lowering', blowoutResultsFull);
    chartDataStore.fullLowering = fullLoweringResults.distribution;

    // Scenario 3: Partial Lowering
    const { slurry_level_partial, gamma_S_partial } = ui.getPartialLoweringInputs();
    const partialLoweringResults = calc.calculatePressureDistribution_PartialLowering(D, t_crown, h_w, E_max_ci_calc, S_ci_calc, eta_W, delta_P, slurry_level_partial, gamma_S_partial, (Math.PI * D * D) / 4);
    ui.updatePressureScenario_PartialLowering(partialLoweringResults);
    const blowoutResultsPartial = calc.calculateBlowoutSafety_DAUB(t_crown, sigma_v_prime_crown_min, h_w, partialLoweringResults.s_air_adv, delta_P);
    ui.updateBlowoutCheck('partial-lowering', blowoutResultsPartial);
    chartDataStore.partialLowering = partialLoweringResults.distribution;


    // 8. Render Always-Visible Chart & Sketch
    chartInstances.ere = charts.renderEreChart(document.getElementById('EreChart').getContext('2d'), chartInstances.ere, ereData, E_max_re, thetaCrit);
    ui.drawWedgeSketch(D, t_crown, h_w, globalThetaCrit, soilLayers, apply_silo, siloResult, penetrationResult);

    // 9. Render the chart for the currently active tab
    renderActiveChart();
}


// --- EVENT HANDLERS ---
function handleTabClick(tabName) {
    ui.showTab(tabName);
    renderActiveChart();
}

function handleToggleSilo() {
    ui.toggleSiloOptions();
}

function handleSave() {
    data.saveInputsToCSV(soilLayers);
}

function handleLoad(event) {
    data.loadInputsFromCSV(event, (loadedData) => {
        if (loadedData.newSoilLayers.length > 0) {
            soilLayers = loadedData.newSoilLayers;
        }
        // Apply single input values
        for (const key in loadedData.singleInputs) {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = loadedData.singleInputs[key] === 'true';
                } else {
                    element.value = loadedData.singleInputs[key];
                }
            }
        }
        // Special case for override field which might not be in older CSVs
        if (loadedData.singleInputs['emax_ci_override'] === undefined) {
             const overrideEl = document.getElementById('emax_ci_override');
             if (overrideEl) overrideEl.value = '';
        }
        ui.toggleSiloOptions(); // Ensure UI state matches loaded checkbox
        rerenderLayers(); // This will trigger updatePlot()
        ui.showModal('Success', 'Data loaded successfully from CSV file.');
    });
}

let batchCancelled = false;

function cancelBatch() {
    batchCancelled = true;
    ui.updateBatchProgress(null, null, 'Cancelling...', 'Cancellation requested by user. Process will stop after current task.');
}

function handleBatchLoad(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    // Reset file input so same files can be selected again
    event.target.value = '';
    
    processBatch(files);
}

async function processBatch(files) {
    batchCancelled = false;
    ui.showBatchModal();
    let successCount = 0;
    const total = files.length;

    ui.updateBatchProgress(0, total, `Preparing to process ${total} files...`, `Starting batch process for ${total} files.`);

    for (let i = 0; i < files.length; i++) {
        if (batchCancelled) {
            ui.updateBatchProgress(i, total, 'Batch Cancelled', 'User cancelled the batch operation.', true);
            break;
        }

        const file = files[i];
        ui.updateBatchProgress(i, total, `Processing: ${file.name}`, `Loading file ${i + 1}/${total}: ${file.name}`);

        try {
            const result = await new Promise((resolve) => {
                data.loadSingleFileFromBlob(file, (data) => resolve(data));
            });

            if (!result) {
                throw new Error(`Failed to read CSV content of ${file.name}`);
            }

            // Apply data to DOM
            Object.keys(result.singleInputs).forEach(key => {
                const el = document.getElementById(key);
                if (el) {
                    if (el.type === 'checkbox') el.checked = (result.singleInputs[key] === 'true');
                    else el.value = result.singleInputs[key];
                }
            });
            
            // Special case for override
            if (result.singleInputs['emax_ci_override'] === undefined) {
                 const overrideEl = document.getElementById('emax_ci_override');
                 if (overrideEl) overrideEl.value = '';
            }

            soilLayers = result.newSoilLayers;
            ui.toggleSiloOptions();
            
            // Critical: wait for DOM and state updates
            rerenderLayers(); 
            // Wait for charts and plots to definitely be updated
            await new Promise(resolve => setTimeout(resolve, 500));

            ui.updateBatchProgress(i, total, `Generating Report: ${file.name}`, `Generating PDF for ${file.name}...`);
            
            if (batchCancelled) {
                ui.updateBatchProgress(i, total, 'Batch Cancelled', 'User cancelled before generation.', true);
                break;
            }

            await report.generatePDFReport(soilLayers, true);
            
            successCount++;
            ui.updateBatchProgress(i + 1, total, `Completed: ${file.name}`, `Successfully generated report for ${file.name}.`);

            // 1 second delay between reports as requested
            if (i < files.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

        } catch (error) {
            console.error(`Error processing ${file.name}:`, error);
            ui.updateBatchProgress(i + 1, total, `Failed: ${file.name}`, `Skipping ${file.name}: ${error.message}`, true);
        }
    }

    ui.finishBatch(successCount, total);
}

function handleGenerateReport() {
    report.generatePDFReport(soilLayers);
}


function applyEmaxProposal() {
    const propVal = document.getElementById('emax_proposal_val').textContent;
    if (propVal && propVal !== 'N/A') {
        const input = document.getElementById('emax_ci_override');
        if (input) {
            input.value = parseFloat(propVal).toFixed(0);
            updatePlot();
        }
    }
}


// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', function() {
    if (typeof Chart === 'undefined') {
        ui.showModal('Error', "Chart.js library not loaded. Please ensure it is accessible and loads correctly. Chart visualizations will not be available.", false);
        return;
    }

    document.getElementById('report_date').valueAsDate = new Date();
    ui.toggleSiloOptions();
    rerenderLayers(); // Initial render and calculation
});


// Expose functions to global scope for HTML onclick handlers
window.updatePlot = updatePlot;
window.addLayer = addLayer;
window.removeLayer = removeLayer;
window.updateLayerValue = updateLayerValue;
window.handleToggleSilo = handleToggleSilo;
window.showTab = ui.showTab; // Keep for internal use if any
window.handleTabClick = handleTabClick; 
window.applyEmaxProposal = applyEmaxProposal;
window.closeModal = ui.closeModal;
window.handleSave = handleSave;
window.handleLoad = handleLoad;
window.handleGenerateReport = handleGenerateReport;
window.handleBatchLoad = handleBatchLoad;
window.cancelBatch = cancelBatch;
window.closeBatchModal = ui.closeBatchModal;
