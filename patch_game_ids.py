import re

def fix_game(filepath):
    with open(filepath, "r") as f:
        code = f.read()

    # Chessboard is wrapped in a div with aspect-square
    code = code.replace("className=\"w-full aspect-square relative rounded-xl overflow-hidden shadow-2xl flex-shrink-0\"", 
                        "id=\"tutorial-chessboard\" className=\"w-full aspect-square relative rounded-xl overflow-hidden shadow-2xl flex-shrink-0\"")
    
    # EvalBar wrapper usually
    code = code.replace("<EvalBar score={evalScore} />", "<div id=\"tutorial-eval-bar\"><EvalBar score={evalScore} /></div>")
    
    # MoveHistory
    code = code.replace("<MoveHistory history={history} />", "<div id=\"tutorial-move-history\" className=\"flex-1 min-h-0 overflow-y-auto\"><MoveHistory history={history} /></div>")
    code = code.replace("<MoveHistory history={history} className=\"flex-1\" />", "<div id=\"tutorial-move-history\" className=\"flex-1 min-h-0 overflow-y-auto\"><MoveHistory history={history} className=\"flex-1\" /></div>")
    
    # CapturedPieces
    code = code.replace("<CapturedPieces ", "<CapturedPieces id=\"tutorial-captured-pieces\" ")
    
    with open(filepath, "w") as f:
        f.write(code)

fix_game("src/components/ComputerGame.tsx")
fix_game("src/components/Game.tsx")
fix_game("src/components/LocalGame.tsx")

