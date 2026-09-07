import re
with open("src/components/Game.tsx", "r") as f:
    code = f.read()

# Insert formatTime before return (
code = code.replace("  return (", """  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (""")

# Insert top clock
code = re.sub(
    r'(<h3 className="font-bold text-lg text-white">\{opponentName\} \{topLabel\}</h3>\s*<p className="text-sm text-emerald-400 font-medium">\{opponentElo\} Elo</p>\s*(?:</div>\s*)*)(</div>\s*</div>)',
    r'\1</div>\n          {game.timeControl && (\n            <div className="bg-neutral-800 px-4 py-2 rounded-xl border border-neutral-700 font-mono text-xl font-bold text-white shadow-inner">\n              {formatTime(isSpectator ? blackDisplayTime : (isWhite ? blackDisplayTime : whiteDisplayTime))}\n            </div>\n          )}\n        </div>',
    code
)

# Insert bottom clock
code = re.sub(
    r'(<h3 className="font-bold text-lg text-white">\{bottomName\} \{bottomLabel\}</h3>\s*<p className="text-sm text-emerald-400 font-medium">\{bottomElo\} Elo</p>\s*(?:</div>\s*)*)(</div>\s*<div className="flex gap-2 mt-2">)',
    r'\1</div>\n          {game.timeControl && (\n            <div className="bg-neutral-800 px-4 py-2 rounded-xl border border-neutral-700 font-mono text-xl font-bold text-emerald-400 shadow-inner">\n              {formatTime(isSpectator ? whiteDisplayTime : (isWhite ? whiteDisplayTime : blackDisplayTime))}\n            </div>\n          )}\n\n          <div className="flex gap-2 mt-2">',
    code
)

with open("src/components/Game.tsx", "w") as f:
    f.write(code)
