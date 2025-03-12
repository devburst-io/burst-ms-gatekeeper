export const welcomeTemplate = (name: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bem-vindo!</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #2c3e50;">Bem-vindo(a) ${name}!</h1>
    <p>Estamos muito felizes em ter você conosco!</p>
    <p>Esperamos que você tenha uma ótima experiência usando nossa plataforma.</p>
    <p>Se precisar de ajuda, não hesite em nos contatar.</p>
    <div style="margin-top: 30px;">
      <p>Atenciosamente,</p>
      <p>Equipe DevBurst</p>
    </div>
  </div>
</body>
</html>
`; 