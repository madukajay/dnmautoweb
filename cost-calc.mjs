/**
 * Import-cost math. Server only — never ship this file to the public site.
 */

// Business Logic Functions

/**
 * Calculate auction fee based on winning bid
 * @param {number} winningBid - Winning bid amount in JPY
 * @returns {number} Auction fee in JPY
 */

const AUTOCOM = 1;
const ICM = 2;

function getAuctionFee(winningBid) {
    // Validate input
    if (typeof winningBid !== 'number' || winningBid < 0) {
        throw new Error('Winning bid must be a positive number');
    }

    // Calculate auction fee based on winning bid ranges
    if (winningBid < 2500000) {
        return 300000;
    } else if (winningBid < 3000000) {
        return 350000;
    } else if (winningBid < 3500000) {
        return 400000;
    } else if (winningBid < 4000000) {
        return 450000;
    } else {
        return 500000;
    }
}

/**
 * Calculate charges based on winning bid amount
 * @param {number} winningBid - The winning bid amount in JPY
 * @returns {number} The calculated charges in JPY
 */
function calculateCharges(winningBid, exporter) {
    // Input validation
    if (typeof winningBid !== 'number' || winningBid < 0) {
        throw new Error('Winning bid must be a positive number');
    }

    if (exporter === AUTOCOM) {
        // For bids up to 1,000,000 JPY
        if (winningBid <= 1000000) {
            return 247000;
        }
        
        // For bids between 1,001,000 and 1,500,000 JPY
        if (winningBid <= 1500000) {
            return 257000;
        }
        
        // For bids between 1,501,000 and 2,000,000 JPY
        if (winningBid <= 2000000) {
            return 277000;
        }
        
        // For bids between 2,000,000 and 2,500,000 JPY
        if (winningBid <= 2500000) {
            return 297000;
        }
        
        // For bids between 2,500,000 and 3,000,000 JPY
        if (winningBid <= 3000000) {
            return 317000;
        }
        
        // For bids above 3,000,000 JPY
        const baseCharge = 317000;
        const additionalAmount = winningBid - 3000000;
        const additionalCharges = Math.ceil(additionalAmount / 500000) * 20000;
        
        return baseCharge + additionalCharges;
    }else{
        let fobTotal = 0;
        if (winningBid <= 1000000) {
            fobTotal = 155000;
        } else if (winningBid <= 1500000) {
            fobTotal = 165000;
        } else if (winningBid <= 2000000) {
            fobTotal = 170000;
        } else if (winningBid <= 2500000) {
            fobTotal = 185000;
        } else if (winningBid <= 3000000) {
            fobTotal = 195000;
        } else if (winningBid <= 3500000) {
            fobTotal = 210000;
        } else if (winningBid <= 4000000) {
            fobTotal = 220000;
        } else if (winningBid <= 4500000) {
            fobTotal = 240000;
        } else if (winningBid <= 5000000) {
            fobTotal = 255000;
        } else if (winningBid <= 5500000) {
            fobTotal = 270000;
        } else if (winningBid <= 6000000) {
            fobTotal = 280000;
        } else if (winningBid <= 6500000) {
            fobTotal = 295000;
        } else if (winningBid <= 7000000) {
            fobTotal = 305000;
        } else if (winningBid <= 7500000) {
            fobTotal = 320000;
        } else if (winningBid <= 8000000) {
            fobTotal = 330000;
        } else if (winningBid <= 8500000) {
            fobTotal = 345000;
        } else if (winningBid <= 9000000) {
            fobTotal = 355000;
        } else if (winningBid <= 9500000) {
            fobTotal = 370000;
        } else if (winningBid <= 10000000) {
            fobTotal = 380000;
        } else if (winningBid <= 12000000) {
            fobTotal = 450000;
        } else {
            // For bids above 12,000,000 JPY (not allowed)
            fobTotal = 0; // or 0, or throw an error
        }

        return fobTotal + 3000; // Adding fixed charge of 3,000 JPY Warranty Cost
    }


}

/**  
 * Get maximum discount voucher based on auction price
 * @param {number} auctionPrice - Auction price in LKR
 * @returns {number|null} Maximum discount voucher in LKR or null if not applicable
 */
function getMaxDiscountVoucher(auctionPrice) {
    // Validate input
    if (typeof auctionPrice !== 'number' || auctionPrice < 1) {
        return null; // or throw an error
    }

    let maxDiscount = 0;

    // Note: Using <= for upper bounds as per the table ranges
    if (auctionPrice <= 1000000) {
        maxDiscount = 80000;
    } else if (auctionPrice <= 1500000) {
        maxDiscount = 90000;
    } else if (auctionPrice <= 2000000) {
        maxDiscount = 95000;
    } else if (auctionPrice <= 2500000) {
        maxDiscount = 105000;
    } else if (auctionPrice <= 3000000) {
        maxDiscount = 115000;
    } else if (auctionPrice <= 3500000) {
        maxDiscount = 130000;
    } else if (auctionPrice <= 4000000) {
        maxDiscount = 140000;
    } else if (auctionPrice <= 4500000) {
        maxDiscount = 160000;
    } else if (auctionPrice <= 5000000) {
        maxDiscount = 170000;
    } else if (auctionPrice <= 5500000) {
        maxDiscount = 180000;
    } else if (auctionPrice <= 6000000) {
        maxDiscount = 190000;
    } else if (auctionPrice <= 6500000) {
        maxDiscount = 205000;
    } else if (auctionPrice <= 7000000) {
        maxDiscount = 215000;
    } else if (auctionPrice <= 7500000) {
        maxDiscount = 230000;
    } else if (auctionPrice <= 8000000) {
        maxDiscount = 240000;
    } else if (auctionPrice <= 8500000) {
        maxDiscount = 250000;
    } else if (auctionPrice <= 9000000) {
        maxDiscount = 260000;
    } else if (auctionPrice <= 9500000) {
        maxDiscount = 270000;
    } else if (auctionPrice <= 10000000) {
        maxDiscount = 280000;
    } else if (auctionPrice <= 12000000) {
        maxDiscount = 300000;
    } else {
        return 0; // or 0, or the maximum value of 300000
    }

    return maxDiscount;
}

/**
 * TT amount (JPY) from winning bid (BUYOUT table).
 * 70–100万 → 220000, 100–150万 → 250000, 150–200万 → 290000,
 * 200–250万 → 320000, 250–300万 → 350000, 300万+ → 370000
 */
function getTTAmount(winningBid) {
    if (typeof winningBid !== 'number' || Number.isNaN(winningBid) || winningBid < 0) {
        return 0;
    }
    if (winningBid <= 1000000) return 220000;
    if (winningBid <= 1500000) return 250000;
    if (winningBid <= 2000000) return 290000;
    if (winningBid <= 2500000) return 320000;
    if (winningBid <= 3000000) return 350000;
    return 370000;
}

function calculateVehicleTax(fob, shipping, taxCategory, capacity, rates) {
    // Input validation
    if (typeof fob !== 'number' || fob < 0) {
        throw new Error('FOB must be a positive number');
    }
    
    if (typeof capacity !== 'number' || capacity < 0) {
        throw new Error('Capacity must be a positive number');
    }
    const yenrate = Number(rates.yenrate);
    const taxBase = Number(rates.taxbase) * (100 / 110) * 0.85;
    let cifYen = (fob + shipping);
    if(taxBase > fob) {
        cifYen = (taxBase + shipping);
    }
    let agent_value = (taxBase + shipping) * yenrate;
    let cif = cifYen * yenrate;
    // Tax rates based on category
    const taxRates = {
        // -- <1000cc Hybrid [HS Code: 8703.40.28]
        'hybrid_under_1000': {
            getExciseDuty: (capacity) => {
                return 1810900; // Fixed rate for <1000cc Hybrid
            },
            cidRate: 0.30, // 30%
            surchargeRate: 0.50, // 50% of CID
            vatRate: 0.18, // 18%
            luxuryThreshold: 5500000,
            luxuryRate: 0.8 // 80%
        },
        // -- <1000cc Petrol [HS Code: 8703.21.69]
        'petrol_under_1000': {
            getExciseDuty: (capacity) => {
                if (capacity <= 660) {
                    return 1992000; // Fixed rate for <800cc
                } else {
                    return capacity * 2450; // Default for >1000cc
                }
            },
            cidRate: 0.30, // 30%
            surchargeRate: 0.50, // 50% of CID
            vatRate: 0.18, // 18%
            luxuryThreshold: 5000000,
            luxuryRate: 1.0 // 100%
        },
        // 1000cc < -- <1300cc Hybrid [HS Code: 8703.40.35]
        'hybrid_1000_1300': {
            getExciseDuty: (capacity) => {
                return capacity * 2750;
                
            },
            cidRate: 0.30, // 30%
            surchargeRate: 0.50, // 50% of CID
            vatRate: 0.18, // 18%
            luxuryThreshold: 5500000,
            luxuryRate: 0.8 // 80%
        },
        // 1000cc < -- <1300cc Petrol [HS Code: 8703.22.50]
        'petrol_1000_1300': {
            // Calculate excise duty based on capacity
            getExciseDuty: (capacity) => {
                    return capacity * 3850;
            },
            cidRate: 0.30, // 30%
            surchargeRate: 0.50, // 50% of CID
            vatRate: 0.18, // 18%
            luxuryThreshold: 5500000,
            luxuryRate: 0.8 // 80%
        },
        // 1300cc < -- <1500cc Hybrid [HS Code: 8703.40.35]
        'hybrid_1300_1500': {
            getExciseDuty: (capacity) => {
                return capacity * 3450;
            },
            cidRate: 0.30, // 30%
            surchargeRate: 0.50, // 50% of CID
            vatRate: 0.18, // 18%
            luxuryThreshold: 5500000,
            luxuryRate: 0.8 // 80%
        },
        // 1300cc < -- <1500cc Petrol [HS Code: 8703.22.50]
        'petrol_1300_1500': {
            getExciseDuty: (capacity) => {
                return capacity * 4450;
            },
            cidRate: 0.3, // 30%
            surchargeRate: 0.5, // 50% of CID
            vatRate: 0.18, // 18%
            luxuryThreshold: 5000000,
            luxuryRate: 1.0 // 100%
        },
        // 1500cc < -- <1600cc Hybrid [HS Code: 8703.40.51]
        'hybrid_1500_1600': {
            getExciseDuty: (capacity) => {
                return capacity * 4800;
            },
            cidRate: 0.30, // 30%
            surchargeRate: 0.50, // 50% of CID
            vatRate: 0.18, // 18%
            luxuryThreshold: 5500000,
            luxuryRate: 0.8 // 80%
        },
        // 1600cc < -- <1800cc Hybrid [HS Code: 8703.40.53]
        'hybrid_1600_1800': {
            getExciseDuty: (capacity) => {
                return capacity * 6300;
            },
            cidRate: 0.30, // 30%
            surchargeRate: 0.50, // 50% of CID
            vatRate: 0.18, // 18%
            luxuryThreshold: 5500000,
            luxuryRate: 0.8 // 80%
        },
        // 1800cc < -- <2000cc Hybrid [HS Code: 8703.40.58]
        'hybrid_1800_2000': {
            getExciseDuty: (capacity) => {
                return capacity * 6900;
            },
            cidRate: 0.30, // 30%
            surchargeRate: 0.50, // 50% of CID
            vatRate: 0.18, // 18%
            luxuryThreshold: 5500000,
            luxuryRate: 0.8 // 80%
        },
        // HEV 50kW < -- < 100kW not more than 1yr old [HS Code: 8703.80.73]
        'hev_50_100_1year': {
            getExciseDuty: (capacity) => {
                return capacity * 40970;
            },
            cidRate: 0.3, // 30%
            surchargeRate: 0.5, // 50% of CID
            vatRate: 0.18, // 18%
            luxuryThreshold: 6000000,
            luxuryRate: 0.6 // 60%
        },
        // HEV 50kW < -- < 100kW more than 1yr old [HS Code: 8703.80.73]
        'hev_50_100_3year': {
            getExciseDuty: (capacity) => {
                return capacity * 43440;
            },
            cidRate: 0.3, // 30%
            surchargeRate: 0.5, // 50% of CID
            vatRate: 0.18, // 18%
            luxuryThreshold: 6000000,
            luxuryRate: 0.6 // 60%
        },
    };

    // Default to hybrid_1000_1300 if category not found
    const category = taxRates[taxCategory] || taxRates['petrol_under_1000'];
    
    // Constants (same for all categories)
    const VEL = 15000; // Vehicle Emission Levy
    const COM = 1750; // Other charges

    // Calculate Luxury Tax based on category-specific threshold
    const luxuryTax = cif > category.luxuryThreshold ? 
        (cif - category.luxuryThreshold) * category.luxuryRate : 0;

    // Calculate Excise Duty using the category-specific function
    const exciseDuty = category.getExciseDuty(capacity);

    // Calculate Cess Import Duty (CID) - category-specific rate
    const cid = cif * category.cidRate;

    // Calculate Surcharge - category-specific rate (toggle in Tax Breakdown column)
    const applySurcharge = rates.applySurcharge !== false;
    const surcharge = applySurcharge ? cid * category.surchargeRate : 0;

    // Calculate SSCL base (CIF * 1.1 + excise duty + cid + surcharge)
    const ssclBase = (cif * 1.1) + exciseDuty + cid + surcharge;
    const sscl = ssclBase * Number(rates.ssclRate) / 100;

    // Calculate VAT base (SSCL base + SSCL) and then VAT at category-specific rate
    // const vatBase = ssclBase + sscl;
    const vatBase = ssclBase; // VAT is calculated on the base before adding SSCL, as per Sri Lankan tax rules
    const vat = vatBase * category.vatRate;

    // Calculate total tax
    const totalTax = luxuryTax + exciseDuty + cid + surcharge + sscl + vat + VEL + COM;

    // Return detailed breakdown
    return {
        cif: cif,
        taxCategory: taxCategory,
        capacity: capacity,
        taxRates: category,
        taxComponents: {
            agentValue: parseFloat(agent_value.toFixed(2)),
            CIF: parseFloat(cif.toFixed(2)),
            exciseDuty: parseFloat(exciseDuty.toFixed(2)),
            cid: parseFloat(cid.toFixed(2)),
            surcharge: parseFloat(surcharge.toFixed(2)),
            sscl: parseFloat(sscl.toFixed(2)),
            vat: parseFloat(vat.toFixed(2)),
            vel: VEL,
            com: COM,
            luxuryTax: parseFloat(luxuryTax.toFixed(2)),
        },
        totalTax: parseFloat(totalTax.toFixed(2)),
        totalWithCIF: parseFloat((cif + totalTax).toFixed(2))
    };
}

/**
 * Get shipping charges based on vehicle model
 * @param {string|number} model - Vehicle model name or model code
 * @returns {object} Object containing model, code, and shipping charges
 */
function getShippingCharges(input) {
    // Model to price mapping
    const shippingRates = {
        // ¥103,000 category
        1: { models: ["Alto", "Mira", "EK Wagon", "Wagon R", "Flair", "Move", "Nissan Dayz", "ROOX", "TAFT", "Yaris", "Spacia", "Every"], charge: 120000 },
        
        // ¥109,000 category
        2: { models: ["Fit HV", "X bee", "Hustler", "Aqua", "Swift", "Note"], charge: 126000 },
        
        // ¥114,000 category
        3: { models: ["Raize", "Rocky", "Roomy", "THOR"], charge: 132000 },
        
        // ¥119,000 category
        4: { models: ["Fielder", "Axio", "Audi A3", "Other sedan"], charge: 138000 },
        
        // ¥124,000 category
        5: { models: ["Sienta HV", "Freed HV"], charge: 144000 },
        
        // ¥129,000 category
        6: { models: ["C-HR", "Vezel HV", "Yaris Cross"], charge: 150000 },
        
        // ¥135,000 category
        7: { models: ["Leaf", "Honda WR-V", "Audi Q3"], charge: 156000 },
        
        // ¥140,000 category
        8: { models: ["Corolla cross"], charge: 162000 },
        
        // ¥145,000 category
        9: { models: ["Eclips cross", "Honda ZR-V"], charge: 168000 },
        
        // ¥150,000 category
        10: { models: ["Voxy HV", "Noah HV", "X-trail"], charge: 174000 },
        
        // ¥155,000 category
        11: { models: ["CR-V", "Step Wagon"], charge: 180000 },
        
        // ¥166,000 category
        12: { models: ["HIACE V", "NISSAN CARAVAN"], charge: 192000 },
        
        // ¥176,000 category
        13: { models: ["ALPHARD", "VELLFIRE"], charge: 204000 },
        
        // ¥186,000 category
        14: { models: ["Land Cruiser Prado"], charge: 216000 }
    };

    // Create reverse lookup for model name to code
    const modelToCode = {};
    Object.keys(shippingRates).forEach(code => {
        shippingRates[code].models.forEach(model => {
            modelToCode[model.toLowerCase()] = parseInt(code);
        });
    });

    // If input is a number (model code)
    if (typeof input === 'number') {
        const code = input;
        if (shippingRates[code]) {
            return {
                code: code,
                models: shippingRates[code].models,
                charge: shippingRates[code].charge,
                chargeFormatted: `¥${shippingRates[code].charge.toLocaleString()}`
            };
        } else {
            throw new Error(`Invalid model code: ${code}. Please use codes 1-14.`);
        }
    }
    
    // If input is a string (model name)
    if (typeof input === 'string') {
        const modelLower = input.trim().toLowerCase();
        const code = modelToCode[modelLower];
        
        if (code) {
            return {
                code: code,
                model: input.trim(),
                models: shippingRates[code].models,
                charge: shippingRates[code].charge,
                chargeFormatted: `¥${shippingRates[code].charge.toLocaleString()}`
            };
        } else {
            // Try partial match
            const matchingCodes = [];
            Object.keys(modelToCode).forEach(modelKey => {
                if (modelKey.includes(modelLower) || modelLower.includes(modelKey)) {
                    if (!matchingCodes.includes(modelToCode[modelKey])) {
                        matchingCodes.push(modelToCode[modelKey]);
                    }
                }
            });
            
            if (matchingCodes.length === 1) {
                const code = matchingCodes[0];
                return {
                    code: code,
                    model: input.trim(),
                    models: shippingRates[code].models,
                    charge: shippingRates[code].charge,
                    chargeFormatted: `¥${shippingRates[code].charge.toLocaleString()}`,
                    note: "Partial match found"
                };
            } else if (matchingCodes.length > 1) {
                throw new Error(`Multiple models found for "${input}". Please be more specific.`);
            } else {
                // Default to Vezel if not found
                return {
                    code: 6,
                    model: "Vezel",
                    models: shippingRates[6].models,
                    charge: shippingRates[6].charge,
                    chargeFormatted: `¥${shippingRates[6].charge.toLocaleString()}`,
                    note: "Model not found, using default (Vezel)"
                };
            }
        }
    }
    
    throw new Error('Input must be a string (model name) or number (model code 1-14)');
}

// Vehicle default settings mapping
const vehicleDefaults = {
    // ¥103,000 category
    "Wagon R": [{ 
        label: "HYBRID ZX", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1736900, 
        capacity: 660, 
        winningBid: 1500000 
    },{
        label: "ZL", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1457500, 
        capacity: 660, 
        winningBid: 1445000 
    },{
        label: "CUSTOM ZX", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1551000, 
        capacity: 660, 
        winningBid: 1400000 
    },{
        label: "HYBRID FX-S", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1200000, 
        capacity: 660, 
        winningBid: 1150000 
    },{
        label: "PETROL FX", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1150000, 
        capacity: 660, 
        winningBid: 1000000 
    }],

    "Flair": [{ 
        label: "G", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1455300, 
        capacity: 660, 
        winningBid: 1200000 
    },{
        label: "Hybrid XG", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1478400, 
        capacity: 660, 
        winningBid: 1150000 
    },
    {
        label: "Hybrid XS", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1733600, 
        capacity: 660, 
        winningBid: 1500000 
    }],

    "Alto": [{ 
        label: "A", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1142900, 
        capacity: 660, 
        winningBid: 850000 
    },{
        label: "L", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1197900, 
        capacity: 660, 
        winningBid: 850000 
    },{
        label: "L Upgrade", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1379400, 
        capacity: 660, 
        winningBid: 950000 
    },{
        label: "HYBRID S", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1350800, 
        capacity: 660, 
        winningBid: 950000 
    },{
        label: "HYBRID X", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1519100, 
        capacity: 660, 
        winningBid: 1000000 
    }],

    "Mira": [{ 
        label: "G SA3", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1320000, 
        capacity: 660, 
        winningBid: 1250000 
    },{
        label: "X SA3", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1179200, 
        capacity: 660, 
        winningBid: 1000000 
    },{
        label: "L SA3", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1025200, 
        capacity: 660, 
        winningBid: 850000 
    },{
        label: "B SA3", 
        taxCategory: "petrol_under_1000", 
        taxbase: 992200, 
        capacity: 660, 
        winningBid: 750000 
    }],

    "Move": [{ 
        label: "L", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1358500, 
        capacity: 660, 
        winningBid: 1000000 
    },{
        label: "X", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1490500, 
        capacity: 660, 
        winningBid: 1250000 
    },{
        label: "G", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1716000, 
        capacity: 660, 
        winningBid: 1300000 
    },{
        label: "RS", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1897500, 
        capacity: 660, 
        winningBid: 1550000 
    }],

    "Nissan Dayz": [{ 
        label: "S", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1437700, 
        capacity: 660, 
        winningBid: 950000 
    },{
        label: "X", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1478400, 
        capacity: 660, 
        winningBid: 1250000 
    },{
        label: "Highway Star X", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1698400, 
        capacity: 660, 
        winningBid: 1300000 
    },{
        label: "Highway Star X ProPilot Edition", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1798500, 
        capacity: 660, 
        winningBid: 1550000 
    },{
        label: "Highway Star G Turbo", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1838100, 
        capacity: 660, 
        winningBid: 1300000 
    },{
        label: "Highway Star G Turbo ProPilot Edition", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1929400, 
        capacity: 660, 
        winningBid: 1550000 
    }],

    "ROOX": [{ 
        label: "S", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1672000, 
        capacity: 660, 
        winningBid: 950000 
    },{
        label: "X", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1739100, 
        capacity: 660, 
        winningBid: 1150000 
    },{
        label: "Highway Star X", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1919500, 
        capacity: 660, 
        winningBid: 1300000 
    },{
        label: "Highway Star X ProPilot Edition", 
        taxCategory: "petrol_under_1000", 
        taxbase: 2105400, 
        capacity: 660, 
        winningBid: 1550000 
    },{
        label: "Highway Star G Turbo", 
        taxCategory: "petrol_under_1000", 
        taxbase: 2159300, 
        capacity: 660, 
        winningBid: 1300000 
    },{
        label: "Highway Star G Turbo ProPilot Edition", 
        taxCategory: "petrol_under_1000", 
        taxbase: 2249500, 
        capacity: 660, 
        winningBid: 1550000 
    }],

    "Spacia": [{ 
        label: "HYBRID G", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1530100, 
        capacity: 657, 
        winningBid: 1050000 
    },{
        label: "HYBRID X", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1705000, 
        capacity: 657, 
        winningBid: 1100000
    },{
        label: "Custom HYBRID GS", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1801800, 
        capacity: 657, 
        winningBid: 1200000
    },{
        label: "Custom HYBRID XS", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1995400, 
        capacity: 657, 
        winningBid: 1300000
    },{
        label: "Custom HYBRID XS TURBO", 
        taxCategory: "petrol_under_1000", 
        taxbase: 2073500, 
        capacity: 657, 
        winningBid: 1500000
    }],

    "EK Wagon": [{ 
        label:"M", 
        taxCategory:"petrol_under_1000", 
        taxbase:"1468500", 
        capacity: 660, 
        winningBid:"900000" 
    },{
        label:"G", 
        taxCategory:"petrol_under_1000", 
        taxbase:"1551000", 
        capacity: 660, 
        winningBid:"1100000"
    }],

    "Every": [{ 
        label:"PA", 
        taxCategory:"petrol_under_1000", 
        taxbase:"1434400", 
        capacity: 660, 
        winningBid:"900000" 
    },{
        label:"PC", 
        taxCategory:"petrol_under_1000", 
        taxbase:"1540000", 
        capacity: 660, 
        winningBid:"1100000"
    },{ 
        label:"JOIN", 
        taxCategory:"petrol_under_1000", 
        taxbase:"1654400", 
        capacity: 660, 
        winningBid:"1200000" 
    },{ 
        label:"JOIN Turbo", 
        taxCategory:"petrol_under_1000", 
        taxbase:"1775400", 
        capacity: 660, 
        winningBid:"1500000" 
    }],

    "Yaris": [{ 
        label: "X 1.0L", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1657700, 
        capacity: 996, 
        winningBid: 1450000 
    },{
        label: "G 1.0L", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1820500, 
        capacity: 996, 
        winningBid: 1600000
    }],

    "TAFT": [{ 
        label: "X", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1419000, 
        capacity: 660, 
        winningBid: 1100000 
    },{
        label: "X Turbo", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1512500, 
        capacity: 660, 
        winningBid: 1250000 
    },{
        label: "G", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1606000, 
        capacity: 660, 
        winningBid: 1300000 
    },{
        label: "G 'Chrome Venture'", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1672000, 
        capacity: 660, 
        winningBid: 1450000 
    },{
        label: "G 'Dark Chrome Venture'", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1677500, 
        capacity: 660, 
        winningBid: 1450000 
    },{
        label: "G Turbo", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1688500, 
        capacity: 660, 
        winningBid: 1450000 
    },{
        label: "G Turbo 'Chrome Venture'", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1754500, 
        capacity: 660, 
        winningBid: 1500000 
    },{
        label: "G Turbo 'Dark Chrome Venture'", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1760000, 
        capacity: 660, 
        winningBid: 1500000 
    }],
    
    // ¥109,000 category
    "Fit HV": [{ 
        label: "Basic",
        taxCategory: "hybrid_1300_1500", 
        taxbase: 2208800, 
        capacity: 1496, 
        winningBid: 1300000 
    },{ 
        label: "Home",
        taxCategory: "hybrid_1300_1500", 
        taxbase: 2404600, 
        capacity: 1496, 
        winningBid: 1620000 
    },{ 
        label: "RS",
        taxCategory: "hybrid_1300_1500", 
        taxbase: 2616900, 
        capacity: 1496, 
        winningBid: 1800000 
    },{ 
        label: "Crosstar",
        taxCategory: "hybrid_1300_1500", 
        taxbase: 2710400, 
        capacity: 1496, 
        winningBid: 1800000 
    },{ 
        label: "LUXE",
        taxCategory: "hybrid_1300_1500", 
        taxbase: 2719200, 
        capacity: 1496, 
        winningBid: 2000000 
    }],

    "X bee": [{ 
        label: "Hybrid MX",
        taxCategory: "petrol_under_1000", 
        taxbase: 2212100, 
        capacity: 996, 
        winningBid: 1600000 
    },{ 
        label: "Hybrid MZ",
        taxCategory: "petrol_under_1000", 
        taxbase: 2388100, 
        capacity: 996, 
        winningBid: 1700000 
    }],

    "Hustler": [{ 
        label: "Hybrid G",
        taxCategory: "petrol_under_1000", 
        taxbase: 1518000, 
        capacity: 660, 
        winningBid: 1400000 
    }, { 
        label: "Hybrid X",
        taxCategory: "petrol_under_1000", 
        taxbase: 1672000, 
        capacity: 660, 
        winningBid: 1500000 
    }],

    "Aqua": [{ 
        label: "X",
        taxCategory: "hybrid_1300_1500", 
        taxbase: 2486000, 
        capacity: 1496, 
        winningBid: 1700000 
    },{ 
        label: "G",
        taxCategory: "hybrid_1300_1500", 
        taxbase: 2654300, 
        capacity: 1496, 
        winningBid: 2000000 
    },{ 
        label: "Z",
        taxCategory: "hybrid_1300_1500", 
        taxbase: 2824800, 
        capacity: 1496, 
        winningBid: 2200000 
    }],

    "Swift": [{ 
        label: "XG",
        taxCategory: "petrol_1000_1300", 
        taxbase: 1727000, 
        capacity: 1196, 
        winningBid: 1200000 
    },{ 
        label: "Hybrid MX",
        taxCategory: "petrol_1000_1300", 
        taxbase: 1922800, 
        capacity: 1196, 
        winningBid: 1450000 
    }, { 
        label: "Hybrid MZ",
        taxCategory: "petrol_1000_1300", 
        taxbase: 2167000, 
        capacity: 1196, 
        winningBid: 1700000 
    }],

    "Note": [{ 
        label: "X 2WD",
        taxCategory: "hybrid_1000_1300", 
        taxbase: 2328700, 
        capacity: 1196, 
        winningBid: 1825000
    }],
    
    // ¥114,000 category
    "Raize": [{
        label: "X 1.0L",
        taxCategory: "petrol_under_1000",
        taxbase: 2079000,
        capacity: 996,
        winningBid: 1800000
    },{
        label: "G 1.0L",
        taxCategory: "petrol_under_1000",
        taxbase: 2235200,
        capacity: 996,
        winningBid: 2000000
    },{
        label: "Z 1.0L",
        taxCategory: "petrol_under_1000",
        taxbase: 2413400,
        capacity: 996,
        winningBid: 2500000
    },{
        label: "G 1.2L HV",
        taxCategory: "hev_50_100_1year",
        taxbase: 2263800,
        capacity: 78,
        winningBid: 2100000
    },{
        label: "Z 1.2L HV",
        taxCategory: "hev_50_100_1year",
        taxbase: 2442000,
        capacity: 78,
        winningBid: 2500000
    }],

    "Rocky": [{
        label: "L 1.0L",
        taxCategory: "petrol_under_1000",
        taxbase: 2039400,
        capacity: 996,
        winningBid: 1600000
    },{
        label: "X 1.0L",
        taxCategory: "petrol_under_1000",
        taxbase: 2187900,
        capacity: 996,
        winningBid: 1800000
    },{
        label: "Premium G 1.0L",
        taxCategory: "petrol_under_1000",
        taxbase: 2432100,
        capacity: 996,
        winningBid: 2000000
    },{
        label: "X HEV 1.2L",
        taxCategory: "hev_50_100_1year",
        taxbase: 2216500,
        capacity: 78,
        winningBid: 2100000
    },{
        label: "Premium G HEV 1.2L",
        taxCategory: "hev_50_100_1year",
        taxbase: 2460700,
        capacity: 78,
        winningBid: 2500000
    }],

    "Roomy": [{ 
        label: "X", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1742400, 
        capacity: 996, 
        winningBid: 1250000 
    },{
        label: "G", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1939300, 
        capacity: 996, 
        winningBid: 1300000
    },{
        label: "Custom G", 
        taxCategory: "petrol_under_1000", 
        taxbase: 2118600, 
        capacity: 996, 
        winningBid: 1400000
    },{
        label: "Custom GT (Turbo)", 
        taxCategory: "petrol_under_1000", 
        taxbase: 2257200, 
        capacity: 996, 
        winningBid: 1600000
    }],

    "THOR": [{ 
        label: "X", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1742400, 
        capacity: 996, 
        winningBid: 1250000 
    },{
        label: "G", 
        taxCategory: "petrol_under_1000", 
        taxbase: 1939300, 
        capacity: 996, 
        winningBid: 1300000
    },{
        label: "Custom G", 
        taxCategory: "petrol_under_1000", 
        taxbase: 2118600, 
        capacity: 996, 
        winningBid: 1400000
    },{
        label: "Custom GT (Turbo)", 
        taxCategory: "petrol_under_1000", 
        taxbase: 2257200, 
        capacity: 996, 
        winningBid: 1600000
    }],
    
    // ¥119,000 category
    "Axio": [{ 
        label: "EX", 
        taxCategory: "petrol_1300_1500", 
        taxbase: 2279200, 
        capacity: 1496, 
        winningBid: 1800000 
    }, { 
        label: "HYBRID EX (NKE165)", 
        taxCategory: "hybrid_1300_1500", 
        taxbase: 2176900, 
        capacity: 1496, 
        winningBid: 2500000 
    }],

    "Audi A3": [{ 
        label: "TFSI Adv (3AA-GYDLA)", 
        taxCategory: "petrol_under_1000", 
        taxbase: 3869800, 
        capacity: 999, 
        winningBid: 2300000 
    }],

    "Vezel HV": [{ 
        label: "e:HEV X HuNT", 
        taxCategory: "hybrid_1300_1500", 
        taxbase: 3108600, 
        capacity: 1496, 
        winningBid: 2500000 
    },{ 
        label: "e:HEV Z", 
        taxCategory: "hybrid_1300_1500", 
        taxbase: 3268100, 
        capacity: 1496, 
        winningBid: 3000000 
    },{
        label: "e:HEV Z Play", 
        taxCategory: "hybrid_1300_1500", 
        taxbase: 3699300, 
        capacity: 1496, 
        winningBid: 3500000 
    },{
        label: "e:HEV RS", 
        taxCategory: "hybrid_1300_1500", 
        taxbase: 3748800, 
        capacity: 1496, 
        winningBid: 3400000 
    }],

    "Yaris Cross": [{ 
        label: "X", 
        taxCategory: "hybrid_1300_1500", 
        taxbase: 2433200, 
        capacity: 1496, 
        winningBid: 2000000 
    },{ 
        label: "G", 
        taxCategory: "hybrid_1300_1500", 
        taxbase: 2546500, 
        capacity: 1496, 
        winningBid: 2250000 
    },{ 
        label: "Z", 
        taxCategory: "hybrid_1300_1500", 
        taxbase: 2887500, 
        capacity: 1496, 
        winningBid: 2500000 
    },{ 
        label: "Z URBANO", 
        taxCategory: "hybrid_1300_1500", 
        taxbase: 2997500, 
        capacity: 1496, 
        winningBid: 2650000 
    },{ 
        label: "Z Adventure", 
        taxCategory: "hybrid_1300_1500", 
        taxbase: 3003000, 
        capacity: 1496, 
        winningBid: 2800000 
    }],

    // ¥135,000 category
    "Leaf": [{ 
        label: "Leaf", 
        taxCategory: "hev_50_100_1year", 
        taxbase: 135000, 
        capacity: 60, 
        winningBid: 1800000
    }], // Electric - special category

    "Honda WR-V": [{ 
        label: "Honda WR-V", 
        taxCategory: "petrol_1300_1500", 
        taxbase: 135000, 
        capacity: 1500, 
        winningBid: 1900000 
    }],

    // ¥140,000 category
    "Corolla cross": [{ 
        label: "G", 
        taxCategory: "hybrid_1600_1800", 
        taxbase: 2760000, 
        capacity: 1796, 
        winningBid: 2500000
    },{ 
        label: "S", 
        taxCategory: "hybrid_1600_1800", 
        taxbase: 2980000, 
        capacity: 1796, 
        winningBid: 2700000
    },{ 
        label: "Z", 
        taxCategory: "hybrid_1600_1800", 
        taxbase: 3430000, 
        capacity: 1796, 
        winningBid: 3000000
    }],

    // ¥155,000 category
    "CR-V": [{ 
        label: "CR-V", 
        taxCategory: "petrol_1300_1500", 
        taxbase: 156666, 
        capacity: 2000, 
        winningBid: 2900000 
    }],
};


function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

export function catalog() {
  const out = {};
  for (const [model, variants] of Object.entries(vehicleDefaults)) {
    out[model] = variants.map((variant) => variant.label);
  }
  return out;
}

export function variantPreset(vehicle, index) {
  const variants = vehicleDefaults[vehicle];
  if (!variants || !variants.length) return null;
  const i = Math.min(Math.max(Number(index) || 0, 0), variants.length - 1);
  const variant = variants[i];
  return {
    index: i,
    label: variant.label,
    taxCategory: variant.taxCategory,
    taxbase: variant.taxbase,
    capacity: variant.capacity,
    winningBid: variant.winningBid,
    tt: getTTAmount(variant.winningBid),
  };
}

export function quote(input) {
  const vehicle = String(input.vehicle || "").trim();
  const winningBid = num(input.winningBid);
  const yenrate = num(input.yenrate);
  const clearing = num(input.clearing);
  const capacity = num(input.capacity);
  const taxbase = num(input.taxbase);
  const ssclRate = num(input.sscl);
  const areaCost = num(input.areaCost);
  const exporter = num(input.exporter) || 1;
  const taxCategory = String(input.taxCategory || "");
  const auctionFeeInputValue = num(input.auctionFee);
  if (!vehicle || [winningBid, yenrate, clearing, capacity, taxbase, ssclRate, areaCost].some((n) => Number.isNaN(n))) {
    return { error: "Please fill in all fields with valid numbers" };
  }
  const TT = exporter === 2
    ? (getMaxDiscountVoucher(winningBid) ?? 0)
    : getTTAmount(winningBid);
  const shippingDetails = getShippingCharges(vehicle);
  const shipping = shippingDetails.charge;
  const handling = calculateCharges(winningBid, exporter);
  const auctionFee = auctionFeeInputValue !== 300000 ? auctionFeeInputValue : getAuctionFee(winningBid);
  const fob = winningBid + handling + areaCost - TT;
  const cif = fob + shipping;
  const lkrCif = cif * yenrate;
  const bankCommission = lkrCif * 0.01;
  const LC = lkrCif + bankCommission;
  const lkrTT = TT * (yenrate + 0.01);
  const taxDetails = calculateVehicleTax(fob, shipping, taxCategory, capacity, {
    yenrate,
    taxbase,
    applySurcharge: input.applySurcharge !== false,
    ssclRate,
  });
  const totalTax = taxDetails.totalTax;
  const totalLKR = auctionFee + lkrTT + LC + totalTax + clearing;
  const { taxRates, ...safeTax } = taxDetails;
  return {
    yenrate,
    early: [
      { title: "CIF (LKR)", value: auctionFee + lkrCif + lkrTT, isLKR: true },
      { title: "Bank Commission", value: bankCommission, isLKR: true },
    ],
    taxes: safeTax.taxComponents,
    totalTax,
    clearing,
    total: totalLKR,
  };
}
