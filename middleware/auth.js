import { auth } from '../auth.js';

/**
 * Middleware de autenticação para proteger rotas
 * Usa a API do Better Auth para validar a sessão
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function requireAuth(req, res, next) {
  try {
    // Constrói um Request do Fetch API a partir do req do Express
    const protocol = req.protocol || (req.secure ? 'https' : 'http');
    const host = req.get('host');
    const fullUrl = `${protocol}://${host}/api/auth/get-session`;
    
    // Copia todos os headers, especialmente o Cookie
    const headers = new Headers();
    Object.keys(req.headers).forEach(key => {
      const value = req.headers[key];
      if (value) {
        // Normaliza o nome do header (lowercase)
        const normalizedKey = key.toLowerCase();
        if (Array.isArray(value)) {
          value.forEach(v => headers.append(normalizedKey, v));
        } else {
          headers.set(normalizedKey, value);
        }
      }
    });
    
    // Garante que o cookie está sendo enviado
    if (req.headers.cookie && !headers.has('cookie')) {
      headers.set('cookie', req.headers.cookie);
    }
    
    const fetchRequest = new Request(fullUrl, {
      method: 'GET',
      headers: headers,
    });
    
    // Usa o handler do Better Auth para obter a sessão
    const response = await auth.handler(fetchRequest);
    const responseBody = await response.text();
    
    if (response.status !== 200) {
      // Se a resposta for null (sem sessão), retorna 401
      if (response.status === 200 && responseBody === 'null') {
        return res.status(401).json({ error: 'Não autenticado' });
      }
      return res.status(401).json({ error: 'Não autenticado' });
    }
    
    // Parse da resposta
    let sessionData;
    try {
      sessionData = JSON.parse(responseBody);
    } catch (e) {
      // Se não conseguir parsear e for 'null', significa sem sessão
      if (responseBody === 'null' || responseBody === '') {
        return res.status(401).json({ error: 'Não autenticado' });
      }
      console.error('Erro ao parsear resposta da sessão:', e, 'Body:', responseBody);
      return res.status(401).json({ error: 'Erro ao validar sessão' });
    }
    
    // Better Auth retorna { user, session } ou null
    if (!sessionData || !sessionData.user) {
      return res.status(401).json({ error: 'Sessão inválida' });
    }
    
    // Adiciona o usuário à requisição para uso nas rotas
    req.user = sessionData.user;
    req.userId = sessionData.user.id;
    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(401).json({ error: 'Erro na autenticação' });
  }
}

