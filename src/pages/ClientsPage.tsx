import { useAuth } from '../hooks/useAuthHook';
import { useClients } from '../hooks/useDB';

export default function ClientsPage() {
  const { masterKey } = useAuth();
  const clients = useClients(masterKey);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-6">Клиенты</h1>

      {clients === undefined && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Загрузка...</p>
      )}

      {clients && clients.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Клиентов пока нет</p>
      )}

      {clients && clients.length > 0 && (
        <ul className="flex flex-col gap-2">
          {clients.map((client) => (
            <li
              key={client.id}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
            >
              <p className="font-medium text-gray-800 dark:text-gray-100">{client.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{client.phone}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}