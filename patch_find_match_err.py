with open("src/components/Lobby.tsx", "r") as f:
    code = f.read()

old_catch = """    } catch (err: any) {
      console.error("Matchmaking error:", err);
      setError("Erro ao buscar partida. Tente novamente.");
    }"""

new_catch = """    } catch (err: any) {
      console.error("Matchmaking error:", err);
      setError("Erro ao buscar partida. Tente novamente.");
      setIsSearching(false);
    }"""

code = code.replace(old_catch, new_catch)

with open("src/components/Lobby.tsx", "w") as f:
    f.write(code)
