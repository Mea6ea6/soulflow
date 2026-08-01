import { useState, useMemo } from 'react';
import { MagnifyingGlassIcon, PlusIcon, UsersIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { Client } from '../types';
import { useAuth } from '../hooks/useAuthHook';
import { useClients } from '../hooks/useDB';
import Avatar from '../components/Avatar';
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
      (c) => c.name.toLowerCase().includes(query) || c.phone.toLowerCase().includes(query)
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
        <h1 className="text-2xl font-display font-semibold text-text-primary">{t('clients.title')}</h1>
        <button
          onClick={handleAddClick}
          className="btn-lift flex items-center gap-2 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors"
        >
          <PlusIcon size={16} />
          {t('clients.addClient')}
        </button>
      </div>

      <div className="relative mb-6 max-w-sm">
        <MagnifyingGlassIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('clients.searchPlaceholder')}
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-bg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {clients === undefined && <p className="text-sm text-text-secondary">{t('common.loading')}</p>}

      {clients && filteredClients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
          <div className="w-14 h-14 rounded-full bg-primary-tint text-primary flex items-center justify-center mb-3">
            <UsersIcon size={24} />
          </div>
          <p className="text-sm text-center">{search ? t('clients.emptySearch') : t('clients.emptyState')}</p>
        </div>
      )}

      {filteredClients.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredClients.map((client) => (
            <button
              key={client.id}
              onClick={() => setSelectedClient(client)}
              className="text-left p-4 rounded-2xl bg-surface shadow-card hover:shadow-card-hover transition-shadow flex items-center gap-3"
            >
              <Avatar name={client.name} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-text-primary truncate">{client.name}</p>
                  <span
                    className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                      client.status === 'active'
                        ? 'bg-success/15 text-success'
                        : 'bg-surface-hover text-text-tertiary'
                    }`}
                  >
                    {client.status === 'active' ? t('clients.status.active') : t('clients.status.archived')}
                  </span>
                </div>
                {client.phone && <p className="text-sm text-text-secondary mt-1 truncate">{client.phone}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      {isModalOpen && (
        <ClientModal client={editingClient} onClose={handleModalClose} />
      )}

      {selectedClient && (
        <ClientCard client={selectedClient} onClose={() => setSelectedClient(null)} onEdit={handleEditClick} />
      )}
    </div>
  );
}