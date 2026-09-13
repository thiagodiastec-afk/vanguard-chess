with open("src/components/Profile.tsx", "r") as f:
    content = f.read()

import_block = """import { User, Swords, Activity, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { updateDoc, doc } from 'firebase/firestore';
import { getDb } from '../lib/firebase';"""

content = content.replace("import { User, Swords, Activity } from 'lucide-react';", import_block)

name_block = """        <div>
          <div className="flex items-center gap-3 mb-1">
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="bg-neutral-900 border border-emerald-500/50 rounded-lg px-3 py-1 text-white font-bold text-xl w-48 focus:outline-none focus:border-emerald-400"
                  autoFocus
                  maxLength={15}
                  disabled={isSaving}
                />
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 px-3 py-1 rounded-lg font-bold text-sm transition-colors"
                >
                  Salvar
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsEditingName(false)}
                  disabled={isSaving}
                  className="bg-neutral-700 hover:bg-neutral-600 text-white px-3 py-1 rounded-lg font-bold text-sm transition-colors"
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-white tracking-tight">{currentUser.displayName}</h2>
                <button 
                  onClick={() => {
                    setNewName(currentUser.displayName);
                    setIsEditingName(true);
                  }}
                  className="p-1.5 text-neutral-400 hover:text-emerald-400 hover:bg-neutral-700 rounded-lg transition-colors"
                  title="Editar Nome"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
          <p className="text-emerald-400 font-medium text-lg">{currentUser.elo} Elo</p>
        </div>"""

content = content.replace("""        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">{currentUser.displayName}</h2>
          <p className="text-emerald-400 font-medium text-lg">{currentUser.elo} Elo</p>
        </div>""", name_block)

state_block = """export default function Profile({ currentUser }: ProfileProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(currentUser.displayName);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newName.trim() === currentUser.displayName) {
      setIsEditingName(false);
      return;
    }
    
    setIsSaving(true);
    try {
      const db = getDb();
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: newName.trim()
      });
      setIsEditingName(false);
    } catch (error) {
      console.error("Erro ao atualizar nome:", error);
      alert("Ocorreu um erro ao atualizar seu nome.");
    } finally {
      setIsSaving(false);
    }
  };"""

content = content.replace("export default function Profile({ currentUser }: ProfileProps) {", state_block)

with open("src/components/Profile.tsx", "w") as f:
    f.write(content)
