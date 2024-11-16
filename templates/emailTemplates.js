const formatDate = (date) => {
  const d = new Date(date);
  const day = (`0${d.getDate()}`).slice(-2);
  const month = (`0${d.getMonth() + 1}`).slice(-2);
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const confirmationTemplate = (client, date, time) => `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmation de rendez-vous</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        color: #333;
        margin: 0;
        padding: 0;
        background-color: #f7f7f7;
      }
      .container {
        width: 100%;
        max-width: 600px;
        margin: 20px auto;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        padding: 20px;
      }
      .header {
        background-color: #0D47A1;
        color: white;
        padding: 10px;
        text-align: center;
        border-radius: 8px 8px 0 0;
      }
      .content {
        padding: 20px;
      }
         .content p {
        color: #666666!important;
      }
      .content h3 {
        color: #0D47A1;
      }
      .footer {
        text-align: center;
        padding: 10px;
        font-size: 12px;
        color: #777;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>Confirmation de rendez-vous</h2>
      </div>
      <div class="content">
        <p>Bonjour ${client.prenom} ${client.nom},</p>
        <p>Nous vous confirmons votre rendez-vous avec Moana Energy.</p>
        <p><strong>Date :</strong> ${formatDate(date)}</p>
        <p><strong>Heure :</strong> ${time}</p>
        <p><strong>Adresse :</strong> ${client.adresse}, ${client.ville} ${client.code_postal}</p>
        <p><strong>Nom du commercial :</strong> ${client.nomCommercial}</p>
        <p><strong>Email du commercial :</strong> ${client.emailCommercial}</p>
        <p><strong>Téléphone du commercial :</strong> ${client.telephoneCommercial}</p>
        <p>Nous restons à votre disposition pour toute information complémentaire.</p>
        <p>Cordialement,</p>
        <p>L'équipe Moana Energy</p>

      </div>
      <div class="footer">
        <p>Ce message vous a été envoyé via le système de gestion de rendez-vous de Moana Energy.</p>
      </div>
    </div>
  </body>
  </html>
`;

const transmissionTemplate = (client) => `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transmission de la fiche client</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        color: #333;
        margin: 0;
        padding: 0;
        background-color: #f7f7f7;
      }
      .container {
        width: 100%;
        max-width: 600px;
        margin: 20px auto;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        padding: 20px;
      }
      .header {
        background-color: #0D47A1;
        color: white;
        padding: 10px;
        text-align: center;
        border-radius: 8px 8px 0 0;
      }
      .content {
        padding: 20px;
      }
        .content p {
        color: #666666!important;
      }
      .content h3 {
        color: #0D47A1;
      }
      .footer {
        text-align: center;
        padding: 10px;
        font-size: 12px;
        color: #777;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>Transmission de la fiche client</h2>
      </div>
      <div class="content">
        <p>Bonjour,</p>
        <p>Veuillez trouver ci-dessous les informations du client :</p>
        <p><strong>Nom :</strong> ${client.nom.charAt(0).toUpperCase() + client.nom.slice(1)}</p>
        <p><strong>Prénom :</strong> ${client.prenom.charAt(0).toUpperCase() + client.prenom.slice(1)}</p>
        <p><strong>Adresse :</strong> ${client.adresse.charAt(0).toUpperCase() + client.adresse.slice(1)}, ${client.ville.charAt(0).toUpperCase() + client.ville.slice(1)} ${client.code_postal}</p>
        <p><strong>Email :</strong> ${client.email}</p>
        <p><strong>Téléphone :</strong> ${client.telephone}</p>
        <p><strong>Superficie :</strong> ${client.superficie.charAt(0).toUpperCase() + client.superficie.slice(1)}</p>
        <p><strong>Type de bâtiment :</strong> ${client.type_batiment.charAt(0).toUpperCase() + client.type_batiment.slice(1)}</p>
        <p><strong>Type de rénovation :</strong> ${client.type_renovation.map(type => type.charAt(0).toUpperCase() + type.slice(1)).join(', ')}</p>
        <p><strong>Statut fiche client :</strong> ${client.statutClient.charAt(0).toUpperCase() + client.statutClient.slice(1)}</p>
        <p><strong>Statut des travaux :</strong> ${client.statutTravaux.charAt(0).toUpperCase() + client.statutTravaux.slice(1)}</p>
        <p><strong>Notes supplémentaires :</strong> ${client.notes.charAt(0).toUpperCase() + client.notes.slice(1)}</p>
        <div style="margin-bottom: 30px;">
          <strong>Photos :</strong>
          ${client.photos.map(photo => `<img src="${photo}" alt="Photo du client" style="max-width: 100px;">`).join('')}
        </div>
        <p><strong>Date de création :</strong> ${formatDate(client.createdAt)}</p>
        <div class="toastBox">
          <h3>Informations commercial</h3>
          <p><strong>Nom du commercial :</strong> ${client.nomCommercial}</p>
          <p><strong>Email du commercial :</strong> ${client.emailCommercial}</p>
          <p><strong>Téléphone du commercial :</strong> ${client.telephoneCommercial}</p>
        </div>
      </div>
      <div class="footer">
        <p>Ce message vous a été envoyé via le système de gestion de Moana Energy.</p>
      </div>
    </div>
  </body>
  </html>
`;

module.exports = {
  confirmationTemplate,
  transmissionTemplate
};