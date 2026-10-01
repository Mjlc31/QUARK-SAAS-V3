const fs = require('fs');
const content = fs.readFileSync('src/contexts/PortalContext.tsx', 'utf8');

let newContent = content.replace(
  'login: (email: string, password: string) => Promise<void>;',
  'login: (email: string, password: string) => Promise<void>;\n  signUp: (name: string, email: string, password: string, cpf?: string) => Promise<void>;'
);

const signUpFunc = `  const signUp = async (name: string, email: string, password: string, cpf?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, cpf, role: 'client' }
        }
      });
      if (error) {
        throw new Error(error.message);
      }
      
      if (data.user) {
        const { error: profileError } = await supabase
          .from('client_portal_users')
          .insert({
            auth_user_id: data.user.id,
            name,
            email,
            cpf,
            is_active: true
          });
          
        if (profileError) {
          console.error('Erro ao criar perfil:', profileError);
        }

        const profile = await fetchClientProfile(data.user.id);
        if (profile) {
          setClient(profile);
        }
      }
    } catch (err: any) {
      const message = err.message || 'Erro ao criar conta';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout`;

newContent = newContent.replace('  const logout', signUpFunc);

newContent = newContent.replace(
  'login,\n        logout,',
  'login,\n        signUp,\n        logout,'
);

fs.writeFileSync('src/contexts/PortalContext.tsx', newContent);
