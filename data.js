const SINGLE_INPUTS = [
    { id: 'D', name: 'Tunnel Diameter D [m]' },
    { id: 't_crown', name: 'Crown Overburden t_crown [m]' },
    { id: 'sigma_s_p', name: 'Permanent Surcharge sigma_s,p [kN/m2]' },
    { id: 'sigma_s_t', name: 'Traffic Surcharge sigma_s,t [kN/m2]' },
    { id: 'h_w', name: 'Groundwater Level h_w [m]' },
    { id: 'gamma_S', name: 'Slurry Unit Weight (No Lowering) gamma_S [kN/m3]' },
    { id: 'slurry_level_partial', name: 'Slurry Level (Partial) [% of D]' },
    { id: 'gamma_S_partial', name: 'Slurry Unit Weight (Partial) gamma_S,part [kN/m3]' },
    { id: 'k2_model', name: 'Lateral Pressure Coeff. (K2) Model' },
    { id: 'sigma_v_model', name: 'Vertical Stress Distribution Model' },
    { id: 'apply_silo', name: 'Apply Silo Theory Checkbox' },
    { id: 'silo_k1', name: 'Silo K1 Value' },
    { id: 'eta_E', name: 'Safety Factor eta_E (Earth)' },
    { id: 'eta_W', name: 'Safety Factor eta_W (Water)' },
    { id: 'delta_P', name: 'Support Pressure Deviation Delta [kN/m2]' },
    { id: 'd10', name: 'Grain Size d10 [mm]' },
    { id: 'tau_f', name: 'Yield Point tau_f [N/m2]' },
    { id: 'emax_ci_override', name: 'Manual Adjustment Emax,ci [kN]' },
    { id: 'report_company', name: 'Report Company' },
    { id: 'report_prepared_by', name: 'Report Prepared By' },
    { id: 'report_cross_section', name: 'Report Cross Section' },
    { id: 'report_date', name: 'Report Date' },
];

export function saveInputsToCSV(soilLayers) {
    let csvContent = "key,value\n";
    SINGLE_INPUTS.forEach(input => {
        const element = document.getElementById(input.id);
        const value = element.type === 'checkbox' ? element.checked : element.value;
        csvContent += `${input.id},"${value}"\n`;
    });
    
    csvContent += "\n#SOIL_LAYERS\n";
    csvContent += "name,depth,gamma_max,gamma_min,gamma_prime_max,gamma_prime_min,phi,c\n";
    soilLayers.forEach(layer => {
        csvContent += `"${layer.name}",${layer.depth},${layer.gamma_max},${layer.gamma_min},${layer.gamma_prime_max},${layer.gamma_prime_min},${layer.phi},${layer.c}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const crossSection = document.getElementById('report_cross_section').value.trim();
    const safeFileName = crossSection 
        ? `${crossSection.replace(/[/\\?%*:|"<>]/g, '-')}.csv` 
        : `tbm_analysis_inputs_${new Date().toISOString().slice(0,10)}.csv`;

    link.setAttribute("download", safeFileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function loadInputsFromCSV(event, callback) {
    const file = event.target.files[0];
    if (!file) return;
    loadSingleFileFromBlob(file, callback);
}

export function loadSingleFileFromBlob(blob, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        let text = e.target.result;
        if (text.charCodeAt(0) === 0xFEFF) text = text.substring(1);

        const lines = text.split(/[\r\n]+/).filter(line => line.trim() !== '');
        
        let isSoilSection = false;
        const newSoilLayers = [];
        const singleInputs = {};
        
        lines.forEach(line => {
            if (line.trim() === '#SOIL_LAYERS') {
                isSoilSection = true;
                return;
            }
            
            if (isSoilSection && !line.startsWith('name,depth')) {
                const values = line.split(',');
                if (values.length === 8) {
                    newSoilLayers.push({
                        name: values[0].replace(/^"|"$/g, ''),
                        depth: parseFloat(values[1]),
                        gamma_max: parseFloat(values[2]),
                        gamma_min: parseFloat(values[3]),
                        gamma_prime_max: parseFloat(values[4]),
                        gamma_prime_min: parseFloat(values[5]),
                        phi: parseFloat(values[6]),
                        c: parseFloat(values[7]),
                    });
                }
            } else if (!isSoilSection && !line.startsWith('key')) {
                const parts = line.split(',');
                const key = parts.shift();
                let value = parts.join(',');
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.substring(1, value.length - 1).replace(/""/g, '"');
                }
                if (key) singleInputs[key] = value;
            }
        });

        callback({ singleInputs, newSoilLayers });
    };
    reader.onerror = () => callback(null);
    reader.readAsText(blob);
}
