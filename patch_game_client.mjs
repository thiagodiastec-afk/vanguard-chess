import fs from 'fs';

const fp = 'src/components/Game.tsx';
let code = fs.readFileSync(fp, 'utf8');

const oldOnDrop = `
    try {
      const db = getDb();
      await updateDoc(doc(db, 'games', game.id), {
        fen: newFen,
        pgn: newPgn,
        turn: newTurn,
        lastMoveAt: Date.now(),
        status: newStatus,
      });
      return true;
    } catch (error) {
      console.error('Error updating game:', error);
      // Revert move visually if update fails
      chess.undo();
      setFen(chess.fen());
      return false;
    }`;

const newOnDrop = `
    try {
      // API Server-Authority Integration
      const res = await fetch('/api/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: game.id,
          source: sourceSquare,
          target: targetSquare,
          promotion: 'q',
          userId: currentUser.uid
        })
      });

      if (res.status === 501) {
        // Fallback for prototype without Firebase Admin Credentials
        const db = getDb();
        await updateDoc(doc(db, 'games', game.id), {
          fen: newFen,
          pgn: newPgn,
          turn: newTurn,
          lastMoveAt: Date.now(),
          status: newStatus,
        });
        return true;
      }

      if (!res.ok) {
        throw new Error('Server rejected move');
      }

      return true;
    } catch (error) {
      console.error('Error updating game:', error);
      // Revert move visually if update fails
      chess.undo();
      setFen(chess.fen());
      return false;
    }`;

code = code.replace(oldOnDrop, newOnDrop);

const oldGameEnd = `
          // Add history entry
          updateData['eloHistory'] = arrayUnion({
            date: Date.now(),
            elo: currentUser.elo + eloChange
          });

          await updateDoc(doc(db, 'users', currentUser.uid), updateData);
        } catch (error) {
          console.error("Erro ao atualizar status:", error);
        }
      };

      updateStats();
    }`;

const newGameEnd = `
          // Add history entry
          updateData['eloHistory'] = arrayUnion({
            date: Date.now(),
            elo: currentUser.elo + eloChange
          });

          // API Server-Authority Integration
          const res = await fetch('/api/game-end', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId: game.id })
          });

          if (res.status === 501) {
             // Fallback to client side updates for prototype
             await updateDoc(doc(db, 'users', currentUser.uid), updateData);
          }

        } catch (error) {
          console.error("Erro ao atualizar status:", error);
        }
      };

      updateStats();
    }`;

code = code.replace(oldGameEnd, newGameEnd);

fs.writeFileSync(fp, code);
console.log("Patched Game.tsx");
