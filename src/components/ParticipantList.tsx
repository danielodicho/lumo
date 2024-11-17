import React from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';

export const ParticipantList: React.FC = () => {
  const { participants, addParticipant, removeParticipant, updatePledge } = useStore();
  const [newName, setNewName] = React.useState('');
  const [newPledge, setNewPledge] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName && newPledge) {
      addParticipant(newName, Number(newPledge));
      setNewName('');
      setNewPledge('');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">Participants</h2>
      
      <form onSubmit={handleSubmit} className="mb-6 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Name"
          className="flex-1 rounded-md border-gray-300 shadow-sm px-4 py-2"
        />
        <input
          type="number"
          value={newPledge}
          onChange={(e) => setNewPledge(e.target.value)}
          placeholder="Pledge amount"
          className="w-32 rounded-md border-gray-300 shadow-sm px-4 py-2"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2"
        >
          <UserPlus size={20} />
          Add
        </button>
      </form>

      <div className="space-y-4">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className="flex items-center justify-between bg-gray-50 p-4 rounded-md"
          >
            <span className="font-medium">{participant.name}</span>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={participant.pledgedAmount}
                onChange={(e) => updatePledge(participant.id, Number(e.target.value))}
                className="w-32 rounded-md border-gray-300 shadow-sm px-4 py-2"
              />
              <button
                onClick={() => removeParticipant(participant.id)}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};