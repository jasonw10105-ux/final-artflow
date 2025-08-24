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