export const handleDownload = async (imageUrl: string | null, filename: string) => {
    if (!imageUrl) {
        alert("Image URL is not available.");
        return;
    }
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Error downloading image:", error);
        alert("Could not download the image.");
    }
};

// Client-side color helpers for UI (safe fallbacks, not for model-grade accuracy)
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    try {
        const h = hex.replace('#', '')
        const m = h.length === 3 ? h.split('').map(c => c + c).join('') : h
        const n = parseInt(m, 16)
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
    } catch { return null }
}

export const contrastColor = (hex: string): '#000000' | '#FFFFFF' => {
    const rgb = hexToRgb(hex)
    if (!rgb) return '#000000'
    // perceived luminance
    const L = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b
    return L > 160 ? '#000000' : '#FFFFFF'
}
