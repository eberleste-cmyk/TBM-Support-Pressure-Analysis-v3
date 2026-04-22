export const D2R = Math.PI / 180;
export const GAMMA_W = 10.0; // Unit weight of water [kN/m³]

/**
 * Calculates height-weighted average EFFECTIVE unit weight, cohesion, and friction angle
 * over a specified height (Z_target), starting from the ground surface.
 * It uses total gamma above GWL and submerged gamma below.
 */
export function calculateSiloAverages(Z_target, h_w, layers, useMinGammas = false) {
    if (Z_target <= 0) {
        return { gamma_effective_av: 0, c_av: 0, phi_av: 0 };
    }

    let weightedGammaEffective = 0;
    let weightedC = 0;
    let weightedPhi = 0;
    let totalHeightConsidered = 0; 
    let currentDepth = 0;

    for (const layer of layers) {
        const layerTop = currentDepth;
        const layerBottom = layer.depth;
        const sliceTop = Math.max(layerTop, 0);
        const sliceBottom = Math.min(Z_target, layerBottom);
        const sliceHeight = sliceBottom - sliceTop;

        if (sliceHeight > 0) {
            const aboveHwTop = sliceTop;
            const aboveHwBottom = Math.min(sliceBottom, h_w);
            const aboveHwThickness = Math.max(0, aboveHwBottom - aboveHwTop);

            const belowHwTop = Math.max(sliceTop, h_w);
            const belowHwBottom = sliceBottom;
            const belowHwThickness = Math.max(0, belowHwBottom - belowHwTop);
            
            const gamma_dry = useMinGammas ? (layer.gamma_min || layer.gamma_max) : layer.gamma_max;
            const gamma_submerged = useMinGammas ? layer.gamma_prime_min : layer.gamma_prime_max; 

            weightedGammaEffective += gamma_dry * aboveHwThickness;
            weightedGammaEffective += gamma_submerged * belowHwThickness;
            weightedC += layer.c * sliceHeight;
            weightedPhi += layer.phi * sliceHeight;
            totalHeightConsidered += sliceHeight;
        }
        
        currentDepth = layerBottom;
        if (Z_target <= layerBottom) break; 
    }
    
    // Handle cases where Z_target is deeper than the defined layers
    if (Z_target > currentDepth && layers.length > 0) {
        const lastLayer = layers[layers.length - 1];
        const extraHeight = Z_target - currentDepth;
        
        const gamma_dry = useMinGammas ? (lastLayer.gamma_min || lastLayer.gamma_max) : lastLayer.gamma_max;
        const gamma_submerged = useMinGammas ? lastLayer.gamma_prime_min : lastLayer.gamma_prime_max; 

        const segmentTop = currentDepth;
        const segmentBottom = Z_target;

        const segmentAboveHwBottom = Math.min(segmentBottom, h_w);
        const segmentAboveHwThickness = Math.max(0, segmentAboveHwBottom - segmentTop);

        const segmentBelowHwTop = Math.max(segmentTop, h_w);
        const segmentBelowHwThickness = Math.max(0, segmentBottom - segmentBelowHwTop);

        weightedGammaEffective += gamma_dry * segmentAboveHwThickness;
        weightedGammaEffective += gamma_submerged * segmentBelowHwThickness;
        weightedC += lastLayer.c * extraHeight;
        weightedPhi += lastLayer.phi * extraHeight;
        totalHeightConsidered += extraHeight;
    }

    if (totalHeightConsidered === 0) return { gamma_effective_av: 0, c_av: 0, phi_av: 0 };

    return {
        gamma_effective_av: weightedGammaEffective / totalHeightConsidered,
        c_av: weightedC / totalHeightConsidered,
        phi_av: weightedPhi / totalHeightConsidered,
    };
}

/**
 * NEW HELPER: Calculates height-weighted average friction angle over the tunnel face height D.
 * This is a specialized function to get the phi needed for the b1 calculation.
 */
function calculateTunnelFacePhiAv(t_crown, D, layers) {
    if (D <= 0) return 0;
    const topZ = t_crown;
    const bottomZ = t_crown + D;
    let weightedPhi = 0;
    let totalHeight = 0;
    let currentDepth = 0;

    for (const layer of layers) {
        const layerTop = currentDepth;
        const layerBottom = layer.depth;
        const intersectionTopZ = Math.max(topZ, layerTop);
        const intersectionBottomZ = Math.min(bottomZ, layerBottom);
        
        if (intersectionBottomZ > intersectionTopZ) {
            const height = intersectionBottomZ - intersectionTopZ;
            weightedPhi += layer.phi * height;
            totalHeight += height;
        }
        
        currentDepth = layer.depth;
        if (layerTop >= bottomZ) break;
    }

    if (totalHeight < 1e-6) {
        const centerZ = t_crown + D / 2;
        for (const layer of layers) {
            if (centerZ <= layer.depth) return layer.phi;
        }
        const lastLayer = layers[layers.length - 1];
        return lastLayer ? lastLayer.phi : 0;
    }

    return weightedPhi / totalHeight;
}


/**
 * Calculates EFFECTIVE vertical stress (sigma'_v) using Janssen's silo theory,
 * incorporating Terzaghi's b1 width and the DAUB 5*b1 height limit.
 */
export function calculateSiloSigmaV(t_crown, sigma_s_user, h_w, layers, D, silo_k1, useMinGammas = false) {
    if (t_crown <= 0 || D <= 0) {
        return { silo_sigma_prime_v: sigma_s_user, B: 0, B_formula_str: '', avg_props: { gamma_effective_av: 0, c_av: 0, phi_av: 0 }, lambda: 0, h1: 0, h2: 0, silo_surcharge: sigma_s_user, phi_for_b1: 0 };
    }

    // Step 1: Calculate Terzaghi's half silo width b1
    // This uses the friction angle averaged over the tunnel face height.
    const phi_av_face = calculateTunnelFacePhiAv(t_crown, D, layers);
    const r = D / 2;
    const phi_rad_face = phi_av_face * D2R;
    const theta_terzaghi_rad = (45 * D2R) + (phi_rad_face / 2); // ϑ = 45° + φ'/2
    const b1 = r / Math.tan(theta_terzaghi_rad / 2); // DAUB 2005, Eq. (2)
    const B = b1;
    const B_formula_str_val = `b₁ = r / tan((45°+φ'face/2)/2) = (${r.toFixed(3)}) / tan((45° + ${phi_av_face.toFixed(1)}°/2)/2)`;

    // Step 2: Apply the 5*b1 height limit (DAUB 2005, p.49)
    const h_limit = 5 * B;
    let h1, h2; // h1 = effective silo height, h2 = surcharge soil height
    if (t_crown <= h_limit) {
        h1 = t_crown;
        h2 = 0;
    } else {
        h1 = h_limit;
        h2 = t_crown - h1;
    }

    // Step 3: Calculate the total surcharge at the top of the effective silo (h1)
    let silo_surcharge = sigma_s_user;
    if (h2 > 0) {
        // The weight of the soil column h2 acts as an additional surcharge.
        // We need the average effective gamma of this h2 column.
        const h2_props = calculateSiloAverages(h2, h_w, layers, useMinGammas);
        silo_surcharge += h2_props.gamma_effective_av * h2;
    }

    // Step 4: Calculate average properties for the Janssen formula over the effective silo height h1
    // Note: The properties are averaged from the top of the surcharge soil (h2) down to the crown.
    // So we calculate properties over the full t_crown and subtract the h2 part. This is complex.
    // A simpler, standard approach is to average properties over the silo height h1 itself.
    const silo_props = calculateSiloAverages(h1, h_w, layers, useMinGammas);
    const { gamma_effective_av, c_av, phi_av } = silo_props;

    // Step 5: Apply Janssen's formula using the calculated parameters
    const phi_rad_silo = phi_av * D2R;
    const K = silo_k1;
    const tan_phi_silo = Math.tan(phi_rad_silo);
    const lambda = K * tan_phi_silo;

    let sigma_prime_v_silo;
    if (Math.abs(lambda) < 1e-9 || B < 1e-6) {
        // Fallback for cohesionless/frictionless soil or zero width
        sigma_prime_v_silo = silo_surcharge + (gamma_effective_av - c_av / Math.max(B, 1e-6)) * h1;
    } else {
        const exponent_term = Math.exp(-lambda * h1 / B);
        const term1 = silo_surcharge * exponent_term;
        const term2 = ((gamma_effective_av * B - c_av) / lambda) * (1 - exponent_term);
        sigma_prime_v_silo = term1 + term2;
    }
    
    return { 
        silo_sigma_prime_v: sigma_prime_v_silo, 
        B: B, 
        B_formula_str: B_formula_str_val, 
        avg_props: silo_props, // Properties averaged over h1
        lambda: lambda,
        h1: h1,
        h2: h2,
        silo_surcharge: silo_surcharge,
        phi_for_b1: phi_av_face, // For UI transparency
        user_surcharge: sigma_s_user,
        h_limit: h_limit
    };
}

export function calculateSigmaVPrime(Z, sigma_s, h_w, layers, useMinGammas = false) {
    let sigma_prime_v = sigma_s;
    if (Z <= 0) return sigma_prime_v;
    
    let currentDepth = 0;

    for (const layer of layers) {
        const layerTop = currentDepth;
        const layerBottom = layer.depth;
        const sliceTop = Math.max(layerTop, 0);
        const sliceBottom = Math.min(Z, layerBottom);
        const sliceThickness = sliceBottom - sliceTop;

        if (sliceThickness > 0) {
            const gamma = useMinGammas ? (layer.gamma_min || layer.gamma_max) : layer.gamma_max;
            const gamma_prime = useMinGammas ? (layer.gamma_prime_min || layer.gamma_prime_max) : layer.gamma_prime_max;
            const aboveHwTop = sliceTop;
            const aboveHwBottom = Math.min(sliceBottom, h_w);
            const aboveHwThickness = Math.max(0, aboveHwBottom - aboveHwTop);
            const belowHwTop = Math.max(sliceTop, h_w);
            const belowHwBottom = sliceBottom;
            const belowHwThickness = Math.max(0, belowHwBottom - belowHwTop);
            sigma_prime_v += gamma * aboveHwThickness;
            sigma_prime_v += gamma_prime * belowHwThickness;
        }
        
        currentDepth = layerBottom;
        if (Z <= layerBottom) break;
    }
    return sigma_prime_v;
}

export function calculatePrismAverages(t_crown, D, h_w, layers) {
    const topZ = t_crown;
    const bottomZ = t_crown + D;
    let weightedPhi = 0;
    let weightedC = 0;
    let totalHeight = 0;
    let currentDepth = 0; 

    for (const layer of layers) {
        const layerTop = currentDepth;
        const layerBottom = layer.depth;
        const intersectionTopZ = Math.max(topZ, layerTop);
        const intersectionBottomZ = Math.min(bottomZ, layerBottom);
        
        if (intersectionBottomZ > intersectionTopZ) {
            const height = intersectionBottomZ - intersectionTopZ;
            weightedPhi += layer.phi * height;
            weightedC += layer.c * height;
            totalHeight += height;
        }
        
        currentDepth = layer.depth;
        if (layerTop >= bottomZ) break;
    }

    if (totalHeight <= 1e-6) {
        const centerZ = t_crown + D / 2;
        for (const layer of layers) {
            if (centerZ <= layer.depth) return { phi_base_av: layer.phi, c_base_av: layer.c };
        }
        const lastLayer = layers[layers.length - 1];
        return lastLayer ? { phi_base_av: lastLayer.phi, c_base_av: lastLayer.c } : { phi_base_av: 0, c_base_av: 0 };
    }

    return {
        phi_base_av: weightedPhi / totalHeight,
        c_base_av: weightedC / totalHeight,
    };
}

export function calculateWedgeAverages(t_crown, D, h_w, layers) {
    const topZ = t_crown;
    const bottomZ = t_crown + D;
    let weightedGammaEffIntegral = 0;
    let weightedPhiIntegral = 0;
    let weightedCIntegral = 0;
    let totalWeightIntegral = 0;
    let currentDepth = 0;
    const h_w_rel_crown = h_w - t_crown;

    for (const layer of layers) {
        const layerTop = currentDepth;
        const layerBottom = layer.depth;
        const intersectionTopZ = Math.max(topZ, layerTop);
        const intersectionBottomZ = Math.min(bottomZ, layerBottom);
        
        if (intersectionBottomZ > intersectionTopZ) {
            const h_top = intersectionTopZ - t_crown;
            const h_bottom = intersectionBottomZ - t_crown;
            const weight_top = (D * h_top - 0.5 * h_top * h_top);
            const weight_bottom = (D * h_bottom - 0.5 * h_bottom * h_bottom);
            const weight = weight_bottom - weight_top;
            
            weightedPhiIntegral += layer.phi * weight;
            weightedCIntegral += layer.c * weight;
            totalWeightIntegral += weight;

            const aboveHw_h_top = h_top;
            const aboveHw_h_bottom = Math.min(h_bottom, h_w_rel_crown);
            if (aboveHw_h_bottom > aboveHw_h_top) {
                const aboveWeight_top = (D * aboveHw_h_top - 0.5 * aboveHw_h_top * aboveHw_h_top);
                const aboveWeight_bottom = (D * aboveHw_h_bottom - 0.5 * aboveHw_h_bottom * aboveHw_h_bottom);
                const aboveWeight = aboveWeight_bottom - aboveWeight_top;
                weightedGammaEffIntegral += layer.gamma_max * aboveWeight;
            }

            const belowHw_h_top = Math.max(h_top, h_w_rel_crown);
            const belowHw_h_bottom = h_bottom;
            if (belowHw_h_bottom > belowHw_h_top) {
                const belowWeight_top = (D * belowHw_h_top - 0.5 * belowHw_h_top * belowHw_h_top);
                const belowWeight_bottom = (D * belowHw_h_bottom - 0.5 * belowHw_h_bottom * belowHw_h_bottom);
                const belowWeight = belowWeight_bottom - belowWeight_top;
                weightedGammaEffIntegral += layer.gamma_prime_max * belowWeight;
            }
        }
        
        currentDepth = layer.depth;
        if (layerTop >= bottomZ) break;
    }

    if (totalWeightIntegral <= 1e-6) {
        const centerZ = t_crown + D / 2;
        for (const layer of layers) {
            if (centerZ <= layer.depth) {
                const gamma_eff = centerZ > h_w ? layer.gamma_prime_max : layer.gamma_max;
                return { gamma_eff_av: gamma_eff, phi_side_av: layer.phi, c_side_av: layer.c };
            }
        }
        const lastLayer = layers[layers.length - 1];
        if (lastLayer) {
           const gamma_eff = centerZ > h_w ? lastLayer.gamma_prime_max : lastLayer.gamma_max;
           return { gamma_eff_av: gamma_eff, phi_side_av: lastLayer.phi, c_side_av: lastLayer.c };
        }
        return { gamma_eff_av: 0, phi_side_av: 0, c_side_av: 0 };
    }

    return {
        gamma_eff_av: weightedGammaEffIntegral / totalWeightIntegral,
        phi_side_av: weightedPhiIntegral / totalWeightIntegral,
        c_side_av: weightedCIntegral / totalWeightIntegral,
    };
}

export function calculateEreComponents(D, sigma_v_prime_crown, theta, sideProps, baseProps, k2_model, sigma_v_model) {
    if (theta <= 0.1 || theta >= 89.9) return null;

    const { gamma_eff_av, phi_side_av, c_side_av } = sideProps;
    const { phi_base_av, c_base_av } = baseProps;
    if (gamma_eff_av <= 0) return null;

    const phi_side_rad = phi_side_av * D2R;
    const phi_base_rad = phi_base_av * D2R;
    const theta_rad = theta * D2R;
    
    let K2;
    const ka = Math.pow(Math.tan(D2R * (45 - phi_side_av / 2)), 2);
    const k0 = 1 - Math.sin(phi_side_rad);
    
    if (k2_model === 'JancseczSteiner') K2 = (k0 + ka) / 2;
    else if (k2_model === 'KirschKolymbas') K2 = k0;
    else if (k2_model === 'AnagnostouKovari') K2 = 0.4;
    else K2 = (k0 + ka) / 2;

    const T_C = (c_side_av * D * D) / (2 * Math.tan(theta_rad));
    let T_R_term1;
    const T_R_term2 = (D * D * D * gamma_eff_av) / (6 * Math.tan(theta_rad));
    if (sigma_v_model === 'KirschKolymbas') {
        T_R_term1 = (D * D * sigma_v_prime_crown) / (2 * Math.tan(theta_rad)); 
    } else {
        T_R_term1 = (D * D * sigma_v_prime_crown) / (3 * Math.tan(theta_rad)); 
    }
    const T_R = K2 * Math.tan(phi_side_rad) * (T_R_term1 + T_R_term2);
    const T = T_R + T_C;
    
    const G = 0.5 * (D * D * D / Math.tan(theta_rad)) * gamma_eff_av;
    const Pv = (D * D / Math.tan(theta_rad)) * sigma_v_prime_crown;

    const N1_term = (G + Pv) * (Math.sin(theta_rad) - Math.cos(theta_rad) * Math.tan(phi_base_rad));
    const N2_term = 2 * T;
    const C_base = (c_base_av * D * D) / Math.sin(theta_rad);
    const Numerator_Correct = N1_term - N2_term - C_base;
    const Denominator_Correct = Math.cos(theta_rad) + Math.sin(theta_rad) * Math.tan(phi_base_rad);
    const Ere = (Math.abs(Denominator_Correct) < 1e-9) ? 0 : Numerator_Correct / Denominator_Correct;
    
    return {
        Ere: Ere > 0 ? Ere : 0, G, Pv, T, T_R, T_C, K2, ka, C_base,
        phi_side: phi_side_av, phi_base: phi_base_av, c_side: c_side_av, c_base: c_base_av
    };
}

export function calculateWre(D, t_crown, h_w) {
    const p_top = Math.max(0, t_crown - h_w) * GAMMA_W;
    const p_bottom = Math.max(0, (t_crown + D) - h_w) * GAMMA_W;
    const p_avg = (p_top + p_bottom) / 2;
    return p_avg * D * D;
}

export function calculateWaterForceCircular(D, t_crown, h_w) {
    if (h_w >= t_crown + D) return 0;
    const R = D / 2;
    const centerZ = t_crown + R;
    let W_ci = 0;
    const num_steps = 200;
    const dy = D / num_steps;
    for (let i = 0; i < num_steps; i++) {
        const y = -R + (i + 0.5) * dy;
        const z = centerZ - y;
        const p_w = Math.max(0, z - h_w) * GAMMA_W;
        const width = 2 * Math.sqrt(R * R - y * y);
        W_ci += p_w * width * dy;
    }
    return W_ci;
}

export function calculatePressureDistribution(D, t_crown, h_w, gamma_S, S_ci, eta_E, eta_W, E_max_ci, delta_P) {
    const results = { depths: [], pressures_W: [], pressures_E_avg: [], pressures_S_min: [], pressures_S_adv_min: [] };
    const Z_crown = t_crown;
    const A_ci = (Math.PI * D * D) / 4;
    
    const s_crown_min_stability = (A_ci > 0) ? (S_ci / A_ci) - (gamma_S * (D / 2)) : 0;
    const p_water_crown = Math.max(0, t_crown - h_w) * GAMMA_W;
    const s_crown_min_water_crown = p_water_crown * eta_W;
    const p_water_invert = Math.max(0, (t_crown + D) - h_w) * GAMMA_W;
    const s_crown_min_water_invert = (p_water_invert * eta_W) - (gamma_S * D);
    const s_crown_min = Math.max(s_crown_min_stability, s_crown_min_water_crown, s_crown_min_water_invert);
    
    const s_crown_advance_min = s_crown_min + delta_P;
    const sigma_E_avg = (A_ci > 0) ? E_max_ci / A_ci : 0;

    for (let i = 0; i <= 50; i++) { 
        const depth = Z_crown + (D / 50) * i;
        results.depths.push(depth);
        results.pressures_W.push(Math.max(0, depth - h_w) * GAMMA_W);
        results.pressures_E_avg.push(sigma_E_avg);
        results.pressures_S_min.push(s_crown_min + (gamma_S * (depth - Z_crown)));
        results.pressures_S_adv_min.push(s_crown_advance_min + (gamma_S * (depth - Z_crown)));
    }
    
    const sigma_W_invert = results.pressures_W.slice(-1)[0];
    const sigma_S_invert_min = results.pressures_S_min.slice(-1)[0];
    const sigma_W_crown = results.pressures_W[0];
    const sigma_S_crown_min = results.pressures_S_min[0];

    return { 
        distribution: results, s_crown_min, s_crown_advance_min, s_crown_min_stability, s_crown_min_water_crown, s_crown_min_water_invert,
        ingress_check_crown: { required: sigma_W_crown * eta_W, unfactored_water: sigma_W_crown, min_pressure: sigma_S_crown_min },
        ingress_check: { required: sigma_W_invert * eta_W, unfactored_water: sigma_W_invert, min_pressure: sigma_S_invert_min }
    };
}

export function calculatePressureDistribution_FullLowering(D, t_crown, h_w, E_max_ci, S_ci, eta_W, delta_P, A_ci) {
    const results = { depths: [], p_water_unfactored: [], p_earth_unfactored: [], p_support_min: [], p_support_op: [] };
    const Z_crown = t_crown;
    
    const s_air_min_stability = (A_ci > 0) ? (S_ci / A_ci) : 0;
    const p_water_invert = Math.max(0, (t_crown + D) - h_w) * GAMMA_W;
    const s_air_min_water_invert = p_water_invert * eta_W;
    const s_air_min = Math.max(s_air_min_stability, s_air_min_water_invert);
    const s_air_adv = s_air_min + delta_P;

    for (let i = 0; i <= 50; i++) { 
        const depth = Z_crown + (D / 50) * i;
        results.depths.push(depth);
        results.p_earth_unfactored.push((A_ci > 0) ? E_max_ci / A_ci : 0);
        results.p_water_unfactored.push(Math.max(0, depth - h_w) * GAMMA_W);
        results.p_support_min.push(s_air_min);
        results.p_support_op.push(s_air_adv);
    }
    
    return { distribution: results, s_air_min, s_air_adv, s_air_min_stability, s_air_min_water_invert };
}

export function calculatePressureDistribution_PartialLowering(D, t_crown, h_w, E_max_ci, S_ci, eta_W, delta_P, slurry_level_pct, gamma_S_part, A_ci) {
    const results = { depths: [], p_water_unfactored: [], p_earth_unfactored: [], p_support_min: [], p_support_op: [] };
    const Z_crown = t_crown;
    const L_slurry = D * slurry_level_pct;
    const Z_interface = (t_crown + D) - L_slurry;

    const p_water_invert = Math.max(0, (t_crown + D) - h_w) * GAMMA_W;
    const required_p_invert_water = p_water_invert * eta_W;
    const s_air_min_water_invert = required_p_invert_water - (gamma_S_part * L_slurry);

    const p_water_interface = Math.max(0, Z_interface - h_w) * GAMMA_W;
    const s_air_min_water_interface = p_water_interface * eta_W;

    const s_air_min_stability = (A_ci > 0) ? (S_ci / A_ci) - (gamma_S_part * L_slurry / 2) : 0;
    
    const s_air_min = Math.max(s_air_min_water_invert, s_air_min_water_interface, s_air_min_stability, 0);
    const s_air_adv = s_air_min + delta_P;

    const sigma_E_avg = (A_ci > 0) ? E_max_ci / A_ci : 0;
    const Z_invert = t_crown + D;

    for (let i = 0; i <= 50; i++) { 
        const depth = Z_crown + (D / 50) * i;
        results.depths.push(depth);
        results.p_earth_unfactored.push(sigma_E_avg);
        results.p_water_unfactored.push(Math.max(0, depth - h_w) * GAMMA_W);
        
        const relative_depth_from_invert = Z_invert - depth; 
        let p_min, p_op;
        if (relative_depth_from_invert <= L_slurry) {
            const depth_in_slurry = L_slurry - relative_depth_from_invert;
            p_min = s_air_min + gamma_S_part * depth_in_slurry;
            p_op = s_air_adv + gamma_S_part * depth_in_slurry;
        } else {
            p_min = s_air_min;
            p_op = s_air_adv;
        }
        results.p_support_min.push(p_min);
        results.p_support_op.push(p_op);
    }

    return { 
        distribution: results, 
        s_air_min, 
        s_air_adv, 
        s_air_min_stability, 
        s_air_min_water_invert,
        s_air_min_water_interface,
        p_water_interface_unfactored: p_water_interface
    };
}

export function calculateSlurryPenetration(D, t_crown, h_w, gamma_S, s_crown_min, d10, tau_f, theta_crit, eta_E, E_max_ci, eta_W, W_ci, S_ci) {
    const fs0 = (3.5 * (tau_f / 1000)) / (d10 / 1000); // kN/m3
    const isPenetrationActive = fs0 < 200;
    
    if (!isPenetrationActive) {
        return { fs0, efficiency: 1.0, earthEfficiency: 1.0, isPenetrationActive, e_max: { crown: 0, axis: 0, invert: 0 } };
    }

    const z_crown = t_crown;
    const z_invert = t_crown + D;
    const theta_rad = theta_crit * D2R;
    const tan_theta = Math.tan(theta_rad);

    const getDeltaP = (z) => {
        const p_slurry = s_crown_min + gamma_S * (z - z_crown);
        const p_water = Math.max(0, z - h_w) * GAMMA_W;
        return Math.max(0, p_slurry - p_water);
    };

    // Efficiency calculation (AA/BB)
    // BB = Total area of penetration zone = Integral of e_max(z)
    // AA = Effective area of penetration zone = Integral of min(e_max(z), x_wedge(z))
    let AA = 0;
    let BB = 0;
    const steps = 100;
    const dz = D / steps;
    for (let i = 0; i < steps; i++) {
        const z = z_crown + (i + 0.5) * dz;
        const dp_z = getDeltaP(z);
        const e_z = dp_z / fs0;
        const x_w_z = (z_invert - z) / tan_theta;
        AA += Math.min(e_z, x_w_z) * dz;
        BB += e_z * dz;
    }

    const earthEfficiency = BB > 0 ? AA / BB : 1.0;
    
    // Total Efficiency = (Transferred Earth Force + Water Force) / Total Required Force
    const transferredEarthForce = eta_E * E_max_ci * earthEfficiency;
    const totalTransferredForce = transferredEarthForce + (eta_W * W_ci);
    const totalEfficiency = S_ci > 0 ? totalTransferredForce / S_ci : 1.0;

    // Explicitly solve for intersection point x (height from invert)
    // x / tan_theta = [s_crown_min + gamma_S*(D-x) - max(0, z_invert - x - h_w)*gamma_W] / fs0
    // Case 1: x >= z_invert - h_w (Point above GW)
    // x * (fs0/tan_theta + gamma_S) = s_crown_min + gamma_S * D
    let x_intersect = (s_crown_min + gamma_S * D) / (fs0 / tan_theta + gamma_S);
    
    // Check if Case 1 is valid
    if (x_intersect < (z_invert - h_w)) {
        // Case 2: x < z_invert - h_w (Point below GW)
        // x * (fs0/tan_theta + gamma_S - gamma_W) = s_crown_min + gamma_S * D - (z_invert - h_w)*gamma_W
        x_intersect = (s_crown_min + gamma_S * D - (z_invert - h_w) * GAMMA_W) / (fs0 / tan_theta + gamma_S - GAMMA_W);
    }
    
    // Clamp x to [0, D]
    x_intersect = Math.max(0, Math.min(D, x_intersect));
    const dp_x = getDeltaP(z_invert - x_intersect);
    const emax_x = dp_x / fs0;

    return {
        fs0,
        efficiency: Math.min(1.0, totalEfficiency),
        earthEfficiency: earthEfficiency,
        isPenetrationActive,
        AA,
        BB,
        wedge_b: D / tan_theta,
        coord_x: x_intersect,
        dp_x: dp_x,
        emax_x: emax_x,
        e_max: { 
            crown: getDeltaP(z_crown) / fs0, 
            axis: getDeltaP(z_crown + D/2) / fs0, 
            invert: getDeltaP(z_invert) / fs0 
        }
    };
}

export function calculateSlurryStabilityCheck(d10, tau_f, phi_base_av, gamma_eff_av) {
    // DAUB 2016, Eq. (3) in Chapter 2.4.1
    // (d10 / (2 * eta_F)) * (gamma_phi / tan(phi')) * gamma_eff_av * gamma_G <= tau_F
    
    const eta_F = 0.6;
    const gamma_phi = 1.15;
    const gamma_G = 1.00;
    
    const d10_m = d10 / 1000; // mm to m
    const phi_rad = phi_base_av * D2R;
    
    if (Math.tan(phi_rad) <= 0) return { tau_f_req: 0, passed: true };
    
    // Calculate required yield point in kN/m2
    const tau_f_req = (d10_m / (2 * eta_F)) * (gamma_phi / Math.tan(phi_rad)) * gamma_eff_av * gamma_G;
    
    const tau_f_kn = tau_f / 1000; // N/m2 to kN/m2
    const passed = tau_f_kn >= tau_f_req;
    
    // Convert to N/m2 for display as requested
    // 1 kN/m2 = 1000 N/m2
    const tau_f_req_nm2 = tau_f_req * 1000;
    const tau_f_provided_nm2 = tau_f; // tau_f is already in N/m2 from input
    
    return {
        tau_f_req,
        tau_f_kn,
        tau_f_req_nm2,
        tau_f_provided_nm2,
        passed,
        params: { eta_F, gamma_phi, gamma_G }
    };
}

export function calculateBlowoutSafety_DAUB(t_crown, sigma_v_prime_crown_min, h_w, s_operational, delta_P) {
    const p_w_crown = Math.max(0, t_crown - h_w) * GAMMA_W;
    const sigma_v_crown_min = sigma_v_prime_crown_min + p_w_crown;
    const s_crown_max_allowable = 0.9 * sigma_v_crown_min;
    const pressure_for_proof = s_operational + delta_P;
    const passed = s_crown_max_allowable >= pressure_for_proof;
    const eta = pressure_for_proof > 0 ? s_crown_max_allowable / pressure_for_proof : Infinity;
    
    return { sigma_v_crown_min, s_crown_max_allowable, pressure_for_proof, eta, passed };
}