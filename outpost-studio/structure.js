import { orderableDocumentListDeskItem } from '@sanity/orderable-document-list'

export default (S, context) => {
  return S.list()
    .title('Content')
    .items([
      orderableDocumentListDeskItem({
        type: 'project',
        title: 'Projects',
        S,
        context,
      }),
      S.listItem()
        .title('Agencies')
        .schemaType('agency')
        .child(S.documentTypeList('agency').title('Agencies')),
    ])
}

