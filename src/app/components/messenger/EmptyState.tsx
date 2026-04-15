import { MessageSquare } from "lucide-react";

interface EmptyStateProps {
  onStartChat?: (userId: string) => void;
}

export function EmptyState({ onStartChat }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#f0f2f5] dark:bg-gray-800 text-gray-500 dark:text-gray-400">
      <MessageSquare className="w-24 h-24 mb-4 text-gray-300 dark:text-gray-600" />
      <h2 className="text-2xl font-medium mb-2 dark:text-gray-300">Выберите чат</h2>
      <p className="text-center">
        Выберите чат из списка слева,
        <br />
        чтобы начать общение
      </p>
      {onStartChat && (
        <button 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          onClick={() => onStartChat('user-1')} // Пример, можно сделать выбор пользователя
        >
          Начать новый чат
        </button>
      )}
    </div>
  );
}