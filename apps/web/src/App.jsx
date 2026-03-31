import { useState } from 'react';

import { generateStrongPassword } from '@password-manager/core';

const initialFolders = [
  { id: 1, name: 'Trabalho', items: 3 },
  { id: 2, name: 'Pessoal', items: 5 },
  { id: 3, name: 'Bancos', items: 2 }
];

export function App() {
  const [password, setPassword] = useState('');

  const handleGeneratePassword = () => {
    const nextPassword = generateStrongPassword({
      length: 20,
      useDigits: true,
      useLowercase: true,
      useUppercase: true,
      useSymbols: true
    });

    setPassword(nextPassword);
  };

  return (
    <main className="container">
      <h1>PasswordManager</h1>
      <p>Gerenciador de senhas para Web + iOS com criptografia por padrão.</p>

      <section className="card">
        <h2>Pastas</h2>
        <ul>
          {initialFolders.map((folder) => (
            <li key={folder.id}>
              <strong>{folder.name}</strong> · {folder.items} credenciais
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Sugestão de senha forte</h2>
        <button type="button" onClick={handleGeneratePassword}>
          Gerar senha
        </button>
        {password && <code>{password}</code>}
      </section>
    </main>
  );
}
