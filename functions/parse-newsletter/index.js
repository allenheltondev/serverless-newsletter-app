const showdown = require('showdown');
const frontmatter = require('@github-docs/frontmatter');
const converter = new showdown.Converter();

exports.handler = async (state) => {
  const newsletter = frontmatter(state.content);
  const sponsor = getSponsorDetails(newsletter.data.sponsor, newsletter.data.sponsor_description, state.sponsors);

  let sections = newsletter.content.split('### ');
  sections = sections.map(s => processSection(s, sponsor));
  sections = sections.filter(ps => ps.header);

  delete sponsor.ad;
  const newsletterDate = new Date(newsletter.data.date);
  const formattedDate = newsletterDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  const dataTemplate = {
    metadata: {
      number: Number(newsletter.data.slug.substring(1)),
      title: newsletter.data.title,
      description: newsletter.data.description,
      date: formattedDate,
      url: `${process.env.NEWSLETTER_BASE_URL}${newsletter.data.slug}`
    },
    sponsor: sponsor,
    content: {}
  };

  dataTemplate.content.sections = sections.map(ps => {
    return {
      header: ps.header,
      text: ps.html
    }
  });

  newsletterDate.setHours(15);
  return { 
    data: dataTemplate,
    sendAtDate: newsletterDate.toISOString(),
    subject: `${process.env.NEWSLETTER_NAME} #${dataTemplate.metadata.number} - ${dataTemplate.metadata.title}`
  };
};

const processSection = (section, sponsor) => {
  const components = section.match(/(.*)(?:\n)(.*)/);
  const content = section.substring(components[0].length).trim();
  let html = convertToHtml(content);
  if(html.includes('{{< sponsor >}}')){
    html = html.replace(/\{\{< sponsor >\}\}/g, formatSponsorAd(sponsor.ad))
  }

  return {
    header: components[1],
    html: html,
    raw: content
  }
};

const getSponsorDetails = (sponsorName, description, sponsorList) => {
  if (!sponsorName) return;

  const sponsor = sponsorList.find(s => s.name.toLowerCase() == sponsorName.toLowerCase());
  if (sponsor) {
    let sponsorAd = description ?? sponsor.description;

    return {
      name: sponsor.name,
      url: sponsor.homepage,
      logo_url: sponsor.logo_url,
      shortDescription: convertToHtml(sponsor.short_description, true),
      ad: sponsorAd,
      displayName: sponsor.displayName ?? true
    }
  }
};

const convertToHtml = (data, removeOuterParagraph = false) => {
  let html = converter.makeHtml(data).replace('</p>\n<p>', '</p><br><p>').replace('</p>\n<p>', '</p><br><p>');
  if (removeOuterParagraph) {
    html = html.replace('<p>', '').replace('</p>', '');
  }

  return html;
};

const formatSponsorAd = (ad) => {
  const formattedAd = convertToHtml(ad, true);
  return `<div style="border-style:solid;border-width:1px;border-color:lightgray;border-radius:15px;padding:.7em;margin-bottom:1em;">
  <p>
      ${formattedAd}
  <i>Sponsored</i>
  </p>
</div>`
}