import Foundation
import Vision
import ImageIO
var output: [[String: Any]] = []
let orientations: [(CGImagePropertyOrientation, Int)] = [(.up,0),(.right,90),(.down,180),(.left,270)]
for file in CommandLine.arguments.dropFirst() {
    var scores: [[String: Any]] = []
    for (orientation, degrees) in orientations {
        let request = VNDetectFaceRectanglesRequest()
        do {
            try VNImageRequestHandler(url:URL(fileURLWithPath:file),orientation:orientation,options:[:]).perform([request])
            let faces = (request.results ?? []).filter {$0.confidence >= 0.7}
            let score = faces.map { face -> Double in
                let roll = abs(face.roll?.doubleValue ?? 0)
                return Double(face.confidence) * Double(face.boundingBox.width * face.boundingBox.height) * max(0, 1 - roll / 0.8)
            }.max() ?? 0
            scores.append(["degrees":degrees,"score":score])
        } catch { scores.append(["degrees":degrees,"score":0]) }
    }
    output.append(["file":file,"scores":scores])
}
FileHandle.standardOutput.write(try JSONSerialization.data(withJSONObject:output,options:[.sortedKeys]))
