const fs = require('fs');

const file = '../tailwind.config.js';
let config = fs.readFileSync(file, 'utf8');

// The new base colors
const bases = {
    lemon_chiffon: '#FEC89A',
    fawn: '#EDE9E1',
    melon: '#FFD7D5',
    lavender_blush: '#FCD5CE',
    mauve: '#BFACC8',
    periwinkle: '#9DBEDB',
    sky_blue: '#5E7182',
    aquamarine: '#708898',
    mint_green: '#AEC2D1',
    tea_green: '#E9ECEF'
};

function hexToRgb(hex) {
    if (!hex) return null;
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToHex(r, g, b) {
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase();
}

function mix(color1, color2, weight) {
    if (!color1) return '#000000';
    var p = weight;
    var w = p * 2 - 1;
    var w1 = (w / 1 + 1) / 2;
    var w2 = 1 - w1;
    return rgbToHex(
        Math.round(color1.r * w1 + color2.r * w2),
        Math.round(color1.g * w1 + color2.g * w2),
        Math.round(color1.b * w1 + color2.b * w2)
    );
}

const white = { r: 255, g: 255, b: 255 };
const black = { r: 0, g: 0, b: 0 };

const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

for (let key in bases) {
    let baseHex = bases[key];
    let baseRgb = hexToRgb(baseHex);
    let newPalette = { DEFAULT: baseHex };

    // Simulate shades
    shades.forEach(step => {
        if (step === 50) newPalette[step] = mix(baseRgb, white, 0.1);
        else if (step < 500) newPalette[step] = mix(baseRgb, white, step / 500);
        else if (step === 500) newPalette[step] = baseHex;
        else newPalette[step] = mix(baseRgb, black, 1 - (step - 500) / 400); // 600-900
    });

    // Regex replace
    let regex = new RegExp(key + ':\\s*\\{[\\s\\S]*?\\}', ''); // replace only the generic palettes
    let replacement = `${key}: {\n`;
    replacement += `        DEFAULT: '${newPalette.DEFAULT}',\n`;
    shades.forEach(s => {
        replacement += `        ${s}: '${newPalette[s]}',\n`;
    });
    replacement += `      }`;

    config = config.replace(regex, replacement);
}

fs.writeFileSync(file, config);
console.log('tailwind.config.js updated successfully!');
