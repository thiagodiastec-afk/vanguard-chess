with open("src/components/CapturedPieces.tsx", "r") as f:
    code = f.read()

code = code.replace("interface CapturedPiecesProps {", "interface CapturedPiecesProps {\n  id?: string;")
code = code.replace("export default function CapturedPieces({ fen, color }: CapturedPiecesProps) {", "export default function CapturedPieces({ fen, color, id }: CapturedPiecesProps) {")
code = code.replace("<div className=\"flex items-center flex-wrap gap-[-4px] ml-1\">", "<div id={id} className=\"flex items-center flex-wrap gap-[-4px] ml-1\">")

with open("src/components/CapturedPieces.tsx", "w") as f:
    f.write(code)

