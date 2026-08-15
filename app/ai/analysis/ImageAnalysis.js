export default class ImageAnalysis {
    async analyze(input = {}) {
        return {
            type: "IMAGE",
            width:
                input.width || null,
            height:
                input.height || null,
            quality:
                input.quality || null,
            labels:
                input.labels || []
        };
    }
