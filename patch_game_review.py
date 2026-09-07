import re
with open("src/components/Game.tsx", "r") as f:
    code = f.read()

# Add import GameReview
if "import GameReview" not in code:
    code = code.replace("import { Chessboard } from 'react-chessboard';", "import { Chessboard } from 'react-chessboard';\nimport GameReview from './GameReview';")

# Add state showReview
if "const [showReview, setShowReview] = useState(false);" not in code:
    code = code.replace("const [showChat, setShowChat] = useState(false);", "const [showChat, setShowChat] = useState(false);\n  const [showReview, setShowReview] = useState(false);")

# Find the game over banner or area to add the review button
# Wait, we already have a Game Over overlay? Let's check `Game.tsx` for "game.status !==" or something overlay
