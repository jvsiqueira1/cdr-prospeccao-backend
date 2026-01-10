import { auth } from '../auth.js';

/**
 * Auth middleware to protect routes using Better Auth session validation.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function requireAuth(req, res, next) {
  try {
    const protocol = req.protocol || (req.secure ? 'https' : 'http');
    const host = req.get('host');
    const fullUrl = `${protocol}://${host}/api/auth/get-session`;

    const headers = new Headers();
    Object.keys(req.headers).forEach((key) => {
      const value = req.headers[key];
      if (value) {
        const normalizedKey = key.toLowerCase();
        if (Array.isArray(value)) {
          value.forEach((v) => headers.append(normalizedKey, v));
        } else {
          headers.set(normalizedKey, value);
        }
      }
    });

    if (req.headers.cookie && !headers.has('cookie')) {
      headers.set('cookie', req.headers.cookie);
    }

    const fetchRequest = new Request(fullUrl, {
      method: 'GET',
      headers: headers,
    });

    const response = await auth.handler(fetchRequest);
    const responseBody = await response.text();

    if (response.status !== 200) {
      if (response.status === 200 && responseBody === 'null') {
        return res.status(401).json({ error: 'Nao autenticado' });
      }
      return res.status(401).json({ error: 'Nao autenticado' });
    }

    let sessionData;
    try {
      sessionData = JSON.parse(responseBody);
    } catch (e) {
      if (responseBody === 'null' || responseBody === '') {
        return res.status(401).json({ error: 'Nao autenticado' });
      }
      console.error('Erro ao parsear resposta da sessao:', e, 'Body:', responseBody);
      return res.status(401).json({ error: 'Erro ao validar sessao' });
    }

    if (!sessionData || !sessionData.user) {
      return res.status(401).json({ error: 'Sessao invalida' });
    }

    req.user = sessionData.user;
    req.userId = sessionData.user.id;
    next();
  } catch (error) {
    console.error('Erro na autenticacao:', error);
    return res.status(401).json({ error: 'Erro na autenticacao' });
  }
}
