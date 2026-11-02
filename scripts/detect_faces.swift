import Foundation
import Vision
import ImageIO
// Entrada/salida local: no servicios ni red.
var output: [[String: Any]] = []
for file in CommandLine.arguments.dropFirst() {
    let request = VNDetectFaceRectanglesRequest()
    do {
        let handler = VNImageRequestHandler(url: URL(fileURLWithPath: file), options: [:])
        try handler.perform([request])
        let faces = (request.results ?? []).filter { $0.confidence >= 0.6 }.map { face -> [String: Double] in
            let b = face.boundingBox
            return ["left": b.minX, "right": b.maxX, "top": 1 - b.maxY, "bottom": 1 - b.minY, "confidence": Double(face.confidence)]
        }
        output.append(["file": file, "faces": faces])
    } catch { output.append(["file": file, "faces": [], "error": "face_detection_failed"]) }
}
let data = try JSONSerialization.data(withJSONObject: output, options: [.sortedKeys])
FileHandle.standardOutput.write(data)
