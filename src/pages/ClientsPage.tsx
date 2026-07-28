import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Users } from 'lucide-react';
import type { Client } from '../types';
import { useAuth } from '../hooks/useAuthHook';
import { useClients } from '../hooks/useDB';
import ClientModal from '../components/ClientModal';
import ClientCard from '../components/ClientCard';

export default function ClientsPage() {
  const { t } = useTranslation();
  const { masterKey } = useAuth();
  const clients = useClients(masterKey);

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    const query = search.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.phone.toLowerCase().includes(query)
    );
  }, [clients, search]);

  const handleAddClick = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const handleEditClick = () => {
    if (selectedClient) {
      setEditingClient(selectedClient);
      setSelectedClient(null);
      setIsModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">{t('clients.title')}</h1>
        <button
          onClick={handleAddClick}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          {t('clients.addClient')}
        </button>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('clients.searchPlaceholder')}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {clients === undefined && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
      )}

      {clients && filteredClients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
          <Users size={32} className="mb-2" />
          <p className="text-sm">
            {search ? t('clients.emptySearch') : t('clients.emptyState')}
          </p>
        </div>
      )}

      {filteredClients.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredClients.map((client) => (
            <button
              key={client.id}
              onClick={() => setSelectedClient(client)}
              className="text-left p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-gray-800 dark:text-gray-100">{client.name}</p>
                <span
                  className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                    client.status === 'active'
                      ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {client.status === 'active' ? t('clients.status.active') : t('clients.status.archived')}
                </span>
              </div>
              {client.phone && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{client.phone}</p>
              )}
            </button>
          ))}
        </div>
      )}

      {isModalOpen && (
        <ClientModal client={editingClient} onClose={handleModalClose} />
      )}

      {selectedClient && (
        <ClientCard
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onEdit={handleEditClick}
        />
      )}
    </div>
  );
}