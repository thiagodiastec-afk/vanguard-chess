import re
with open("src/components/Game.tsx", "r") as f:
    code = f.read()

if "import GameReview" not in code:
    code = "import GameReview from './GameReview';\n" + code

if "import { BrainCircuit }" not in code and "BrainCircuit" not in code.split("lucide-react")[0]:
    code = code.replace("from 'lucide-react';", ", BrainCircuit } from 'lucide-react';")

if "const [showReview, setShowReview]" not in code:
    code = code.replace("const [showChat, setShowChat] = useState(false);", "const [showChat, setShowChat] = useState(false);\n  const [showReview, setShowReview] = useState(false);")

with open("src/components/Game.tsx", "w") as f:
    f.write(code)
