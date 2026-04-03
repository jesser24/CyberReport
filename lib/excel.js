function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function cell(value, type = 'String') {
  return `<Cell><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
}

function buildIncidentsExcel(incidents) {
  const headers = [
    'ID',
    'Ticket',
    'Titre',
    'Prénom',
    'Nom',
    'Email',
    'Téléphone',
    'Service',
    'Type d\'incident',
    'Gravité',
    'Statut',
    'Appareil',
    'Description',
    'Fichier joint',
    'Date de création',
    'Dernière mise à jour'
  ];

  const rows = incidents.map((incident) => [
    incident.id,
    incident.ticket_number,
    incident.titre_incident || '',
    incident.prenom,
    incident.nom,
    incident.email,
    incident.telephone || '',
    incident.service || '',
    incident.type_incident,
    incident.gravite,
    incident.statut,
    incident.appareil || '',
    incident.description || '',
    incident.fichier || '',
    formatDate(incident.date_creation),
    formatDate(incident.date_modification)
  ]);

  const headerRow = `<Row ss:StyleID="header">${headers.map((h) => cell(h)).join('')}</Row>`;
  const dataRows = rows.map((row) => (
    `<Row>${row.map((value, index) => cell(value, index === 0 ? 'Number' : 'String')).join('')}</Row>`
  )).join('');

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#0F172A"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="header">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Incidents">
  <Table>
   <Column ss:AutoFitWidth="0" ss:Width="60"/>
   <Column ss:AutoFitWidth="0" ss:Width="120"/>
   <Column ss:AutoFitWidth="0" ss:Width="180"/>
   <Column ss:AutoFitWidth="0" ss:Width="90"/>
   <Column ss:AutoFitWidth="0" ss:Width="110"/>
   <Column ss:AutoFitWidth="0" ss:Width="180"/>
   <Column ss:AutoFitWidth="0" ss:Width="95"/>
   <Column ss:AutoFitWidth="0" ss:Width="120"/>
   <Column ss:AutoFitWidth="0" ss:Width="130"/>
   <Column ss:AutoFitWidth="0" ss:Width="85"/>
   <Column ss:AutoFitWidth="0" ss:Width="95"/>
   <Column ss:AutoFitWidth="0" ss:Width="120"/>
   <Column ss:AutoFitWidth="0" ss:Width="340"/>
   <Column ss:AutoFitWidth="0" ss:Width="130"/>
   <Column ss:AutoFitWidth="0" ss:Width="130"/>
   <Column ss:AutoFitWidth="0" ss:Width="130"/>
   ${headerRow}
   ${dataRows}
  </Table>
 </Worksheet>
</Workbook>`;
}

module.exports = { buildIncidentsExcel };
