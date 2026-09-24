export type PolicyBlock =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] };

export type PolicySection = {
  id: string;
  title: string;
  blocks: PolicyBlock[];
};

export type PolicyHighlight = {
  value: string;
  label: string;
};

export type PolicyPageContent = {
  id: string;
  path: string;
  title: string;
  navLabel: string;
  description: string;
  intro: string;
  updated: string;
  updatedIso: string;
  highlights: PolicyHighlight[];
  sections: PolicySection[];
};

export const POLICY_UPDATED = '12 September 2026';
export const POLICY_UPDATED_ISO = '2026-09-12';

export const policies: PolicyPageContent[] = [
  {
    id: 'returns',
    path: '/returns-refunds/',
    title: 'Return & Refund',
    navLabel: 'Return & Refund',
    description:
      'How to request a return on an IWC replica watch within 14 days of delivery, what condition we accept, and how refunds are issued.',
    intro:
      'Return requests are accepted within 14 days of delivery. This page explains how to open a request, what condition the watch must be in, and how a refund is processed. It applies to replica IWC watches sold on this site, not to genuine IWC boutique stock.',
    updated: POLICY_UPDATED,
    updatedIso: POLICY_UPDATED_ISO,
    highlights: [
      { value: '14 days', label: 'Return requests from the delivery date' },
      { value: 'Unused', label: 'Watch, papers, and packing as received' },
      { value: 'Request first', label: 'Contact us before you send anything back' },
    ],
    sections: [
      {
        id: 'window',
        title: 'Return window',
        blocks: [
          {
            type: 'p',
            text: 'You may request a return within 14 days of the delivery date shown on the tracking record. After that window, the order is handled under the [warranty policy](/warranty-policy/) if the movement develops a covered fault, not as a change-of-mind return.',
          },
          {
            type: 'p',
            text: 'The 14-day clock starts when the courier marks the parcel delivered, not when you open it. If tracking shows delivered and you have not received the carton, write to [contact](/contact/) immediately so we can open a carrier trace.',
          },
        ],
      },
      {
        id: 'how-to-request',
        title: 'How to request a return',
        blocks: [
          {
            type: 'p',
            text: 'Do not ship a watch back until we confirm the request. Unannounced parcels are slower to match to an order and may be refused.',
          },
          {
            type: 'ol',
            items: [
              'Open [contact](/contact/) with your order email, the product name or reference, and the delivery date.',
              'Tell us whether the return is unused, a transit issue, or a fault you found after delivery. Attach clear photos or a short video of the watch and the packing.',
              'Wait for written return instructions and an address. We will tell you what to include in the parcel.',
              'Send the watch with a tracked, insured service. Keep the receipt until the refund is complete.',
            ],
          },
        ],
      },
      {
        id: 'condition',
        title: 'Condition we accept',
        blocks: [
          {
            type: 'p',
            text: 'The watch must be unused and in the same condition you received it. That includes the timepiece, any presentation box or papers that shipped with that SKU, and the inner packing. Wrist wear, polished scratches, resized bracelets that cannot be restored, missing links, or a crystal with new marks can lead to a refused return or a reduced refund after inspection.',
          },
          {
            type: 'ul',
            items: [
              'Do not wear the watch as a daily piece and then send it back as unused.',
              'Do not remove factory films, tags, or protective stickers if they were still on the piece at delivery.',
              'Do not put courier labels on a presentation box. Use a plain outer carton.',
              'Accessories follow the product page. If a listing shipped the watch only, we do not expect a full box set on the return.',
            ],
          },
        ],
      },
      {
        id: 'qc-approved',
        title: 'QC-approved orders',
        blocks: [
          {
            type: 'p',
            text: 'Every order is inspected before dispatch. You receive a [QC video](/qc-videos/) of the allocated watch and approve it before the carton is sealed. Approving QC means you accepted the finishing and functions shown in that clip. A return after delivery is still available inside the 14-day window if the watch is unused, but “it looks different from the listing photo” is not a defect when the approved video matches the piece you received.',
          },
          {
            type: 'p',
            text: 'If you reject QC before shipment, we do not send that watch. You may ask for another piece, another [collection](/collections/) model at the listed price difference, or a refund of amounts already paid. That is a pre-shipment change, not a 14-day delivery return.',
          },
        ],
      },
      {
        id: 'refunds',
        title: 'What we refund',
        blocks: [
          {
            type: 'p',
            text: 'Once the returned watch passes inspection, we refund the product price to the original payment method used at checkout. Outbound shipping on this store is free, so there is no outbound shipping charge to refund. Return shipping to us is paid by you unless we confirm the piece arrived damaged in transit or we sent the wrong reference.',
          },
          {
            type: 'p',
            text: 'Refund timing depends on the payment provider. After we accept the return, most refunds show as pending within a few business days; your bank or wallet may take longer to post the credit. We do not refund customs, duties, or local handling charged by your country’s postal service unless we agreed in writing before the return.',
          },
        ],
      },
      {
        id: 'not-refunded',
        title: 'What we do not refund',
        blocks: [
          {
            type: 'ul',
            items: [
              'Requests opened after 14 days from delivery, unless the [warranty policy](/warranty-policy/) applies.',
              'Watches that have been worn, altered, resized beyond a simple link return, or serviced by a third party.',
              'Missing links, tools, cards, or packing that shipped with the order and were not sent back.',
              'Orders refused at the door without contacting us first, if the refusal causes a return-to-sender fee we cannot recover.',
              'Change-of-mind returns after you asked us to engrave, customize, or source a piece outside the live [shop](/shop/) listing, unless we agree in writing.',
            ],
          },
        ],
      },
      {
        id: 'inspection',
        title: 'Inspection after we receive the watch',
        blocks: [
          {
            type: 'p',
            text: 'We inspect the returned watch against the QC record for that order. If the piece matches the unused condition we require, we process the refund. If it does not, we will write to you with photos and either decline the return, offer a partial refund, or ship the watch back. We aim to complete that inspection within five business days of the parcel arriving at the return address we gave you.',
          },
        ],
      },
      {
        id: 'exchanges',
        title: 'Exchanges',
        blocks: [
          {
            type: 'p',
            text: 'Size, dial, or collection swaps are treated as a return of the original piece plus a new order at the current listed price. We do not hold a second watch in reserve unless support confirms stock. If you want another Pilot, Offshore, or Portofino reference, say so in the return request so we can check the [catalog](/shop/) before you ship.',
          },
        ],
      },
      {
        id: 'wrong-or-damaged',
        title: 'Wrong item or transit damage',
        blocks: [
          {
            type: 'p',
            text: 'If the watch is not the reference you approved, or the carton arrives crushed with a damaged crystal, case, or bracelet, photograph the outer carton, inner packing, and watch before you wear it. Send those images through [contact](/contact/). In those cases we cover a replacement or a refund of the product price, including a prepaid return label when we ask you to send the piece back.',
          },
        ],
      },
    ],
  },
  {
    id: 'privacy',
    path: '/privacy-policy/',
    title: 'Privacy Policy',
    navLabel: 'Privacy Policy',
    description:
      'What personal data this IWC replica store collects at checkout and support, how it is used, who it is shared with, and how to ask us about your information.',
    intro:
      'This policy describes the personal data we collect when you browse, check out, or write to us, why we use it, and who receives it. It covers this storefront only. We sell replica IWC watches. We are not IWC SA and we do not share your order with that manufacture.',
    updated: POLICY_UPDATED,
    updatedIso: POLICY_UPDATED_ISO,
    highlights: [
      { value: 'Checkout', label: 'Name, email, phone, and delivery address' },
      { value: 'Payments', label: 'Handled by the checkout processor, not stored as full card numbers here' },
      { value: 'Support', label: 'Ask us to access or delete what we hold' },
    ],
    sections: [
      {
        id: 'who',
        title: 'Who this policy covers',
        blocks: [
          {
            type: 'p',
            text: 'This website is an independent catalog of replica IWC collections. When this policy says “we,” it means the operator of this storefront. Questions about data go to [contact](/contact/), the same channel used for orders and WhatsApp support.',
          },
        ],
      },
      {
        id: 'collect',
        title: 'Information we collect',
        blocks: [
          {
            type: 'p',
            text: 'You provide some of this information directly. Other items are created when the site or a payment or shipping partner runs.',
          },
          {
            type: 'ul',
            items: [
              'Identity and contact: name, email address, phone number.',
              'Delivery and billing: street address, city, postal code, country, and any order notes you type at checkout.',
              'Order contents: product titles, quantities, prices, QC approval status, and messages you send about the watch.',
              'Payment metadata: last status from the checkout provider (currently flypay). We do not store full card numbers on this site.',
              'Support records: emails, WhatsApp or contact-form messages, photos or videos you send for QC, returns, or warranty.',
              'Technical data: IP address, browser type, device, pages viewed, and cart contents stored in your browser as needed to complete a purchase.',
            ],
          },
        ],
      },
      {
        id: 'use',
        title: 'How we use it',
        blocks: [
          {
            type: 'ul',
            items: [
              'To confirm the order, take payment, run [QC](/qc-videos/), and ship the watch under the [shipping policy](/shipping-policy/).',
              'To send tracking, answer size or reference questions, and handle [returns](/returns-refunds/) or [warranty](/warranty-policy/) claims.',
              'To prevent fraud, unpaid orders, or address abuse.',
              'To send newsletter notes only if you submit the footer form or tick email offers at checkout. You can stop those messages by writing to us.',
              'To keep records we need for tax, dispute, or accounting rules that apply to the store.',
            ],
          },
        ],
      },
      {
        id: 'share',
        title: 'Who we share it with',
        blocks: [
          {
            type: 'p',
            text: 'We share the minimum needed to complete the purchase. We do not sell your email list.',
          },
          {
            type: 'ul',
            items: [
              'Payment processor: flypay (or the provider shown at checkout) receives the details required to take payment. Their privacy terms apply to card or wallet data they hold.',
              'Carriers and logistics partners: name, phone, and address so the parcel can move and be tracked.',
              'Infrastructure: hosting, storage, and email systems that keep the catalog, cart, and order records online.',
              'Authorities: if we are legally required to disclose an order or a support thread.',
            ],
          },
        ],
      },
      {
        id: 'cookies',
        title: 'Cookies and similar storage',
        blocks: [
          {
            type: 'p',
            text: 'This store uses cookies and browser storage that are required to keep a cart, remember checkout fields, and keep an admin session if you work on the catalog. We do not run a third-party advertising pixel or analytics tag on the storefront as of the date above. If that changes, we will update this section.',
          },
          {
            type: 'p',
            text: 'You can block cookies in your browser. If you do, the cart and checkout may not complete. Essential cookies are not used to build an advertising profile.',
          },
        ],
      },
      {
        id: 'retention',
        title: 'How long we keep it',
        blocks: [
          {
            type: 'p',
            text: 'Order, shipping, and QC records are kept for as long as we may need them for delivery disputes, the 14-day return window, and the one-year movement warranty, and then for a reasonable accounting period. Support photos and videos are kept with the order they belong to. Newsletter addresses are kept until you ask to be removed. Browser cart data stays on your device until you clear it.',
          },
        ],
      },
      {
        id: 'rights',
        title: 'Your choices',
        blocks: [
          {
            type: 'p',
            text: 'Depending on where you live, you may ask us to confirm what we hold, correct an address or name, delete data we no longer need, or stop marketing email. Send the request from the email you used at checkout through [contact](/contact/). We may need to verify that you are the customer before we change or delete an order file. We may retain a limited record where the law requires it (for example a completed payment).',
          },
        ],
      },
      {
        id: 'transfers',
        title: 'International processing',
        blocks: [
          {
            type: 'p',
            text: 'This catalog ships worldwide. Your data may be processed in the country where the store is operated and in countries where payment, hosting, or courier partners run. By placing an order you understand that the address and contact details you give will leave your country so the watch can be packed, tracked, and delivered.',
          },
        ],
      },
      {
        id: 'children',
        title: 'Children',
        blocks: [
          {
            type: 'p',
            text: 'This store is not directed at children under 16. We do not knowingly take orders from minors. If you believe we have collected a child’s data, write to us and we will delete it.',
          },
        ],
      },
      {
        id: 'changes',
        title: 'Changes to this policy',
        blocks: [
          {
            type: 'p',
            text: 'We may update this page when checkout, shipping, or support tools change. The date at the top is the current version. Continued use of the site after an update means you accept the revised policy for new orders.',
          },
        ],
      },
    ],
  },
  {
    id: 'shipping',
    path: '/shipping-policy/',
    title: 'Shipping Policy',
    navLabel: 'Shipping Policy',
    description:
      'Free worldwide tracked shipping on replica IWC watches: QC approval first, discreet packing, then a typical 9–12 day delivery window.',
    intro:
      'Shipping is free and tracked to destinations available at checkout. A watch does not leave until you approve the quality-check video. After approval we pack a plain carton and hand it to the courier, usually within 24–48 hours. Most parcels then take nine to twelve days to the door. Times vary by country.',
    updated: POLICY_UPDATED,
    updatedIso: POLICY_UPDATED_ISO,
    highlights: [
      { value: 'Free', label: 'Tracked shipping on qualifying checkout destinations' },
      { value: 'QC first', label: 'No dispatch until you approve the inspection clip' },
      { value: '9–12 days', label: 'Typical transit after the parcel is with the courier' },
    ],
    sections: [
      {
        id: 'cost',
        title: 'Shipping cost',
        blocks: [
          {
            type: 'p',
            text: 'Checkout lists a single option: free tracked shipping. There is no extra dispatch fee on the order total for destinations in the country list. If a country is missing from that list, do not assume we can send there. Ask on [contact](/contact/) before you pay.',
          },
        ],
      },
      {
        id: 'when-we-ship',
        title: 'When we ship',
        blocks: [
          {
            type: 'p',
            text: 'Payment confirmation starts quality control, not the courier clock. Inspection, movement checks, and the [QC video](/qc-videos/) usually take about three days. We ship after you approve that clip. Packing and handover then take 24–48 hours. Add those stages together; nine to twelve days is transit after dispatch, not time from the moment you click pay.',
          },
          {
            type: 'p',
            text: 'If you do not reply to QC, the watch stays on hold. We will follow up. We do not treat silence as approval.',
          },
        ],
      },
      {
        id: 'transit',
        title: 'Transit times',
        blocks: [
          {
            type: 'p',
            text: 'Most destinations in the live country list arrive in nine to twelve days after the courier scan. Remote islands, delayed customs desks, or peak seasons can run longer. The [delivery proofs](/delivery-proofs/) page shows how that journey is described on this site. We do not promise a signature time slot.',
          },
        ],
      },
      {
        id: 'tracking',
        title: 'Tracking',
        blocks: [
          {
            type: 'p',
            text: 'A tracking number is sent to the checkout email after the parcel is with the courier. We do not issue a number during QC. If tracking stalls for several days, write to us with the number and we will open a trace with the carrier. Claims for loss follow the carrier’s process; we start that process with you rather than asking you to negotiate it alone.',
          },
        ],
      },
      {
        id: 'packaging',
        title: 'Packaging',
        blocks: [
          {
            type: 'p',
            text: 'The outer carton is plain. It does not print IWC, Pilot, or other watch wording on the shipping face. Inside, the watch is wrapped for transit. Neighbours and lobby staff see a standard international parcel. What is in the box besides the watch follows the product page: some SKUs include a presentation box; others ship the watch only.',
          },
        ],
      },
      {
        id: 'tax',
        title: 'Tax, duties, and customs',
        blocks: [
          {
            type: 'p',
            text: 'The store banner states tax-free worldwide dispatch from our side. Local postal or customs practice can still vary. If your country inspects luxury goods, holds parcels, or charges a handling fee, that process sits with the destination, not with a boutique warranty desk. If you already know the destination is strict, [contact us](/contact/) before you order.',
          },
          {
            type: 'p',
            text: 'We pack for a discreet, documented shipment. We do not instruct you to misdeclare a parcel or to evade a lawful inspection. If a parcel is returned by customs, write to us. We will discuss a reship or a path under the [return & refund](/returns-refunds/) rules for that case.',
          },
        ],
      },
      {
        id: 'address',
        title: 'Address accuracy',
        blocks: [
          {
            type: 'p',
            text: 'Use a name and address the courier can reach. Include a working phone number. We are not responsible for a watch left with a neighbour, a building desk, or a local post office if tracking shows delivered to the address you entered. Corrections after handover may not be possible.',
          },
        ],
      },
      {
        id: 'damage-loss',
        title: 'Damage, delay, and loss',
        blocks: [
          {
            type: 'p',
            text: 'Photograph a damaged carton before you discard it. If the watch is missing parts or the crystal is broken on arrival, follow the transit-damage notes on the [return & refund](/returns-refunds/) page. For delay beyond a reasonable window for your country, we will check the last scan and, if the carrier confirms loss, arrange a replacement or a refund of the product price.',
          },
        ],
      },
    ],
  },
  {
    id: 'terms',
    path: '/terms/',
    title: 'Terms of Use',
    navLabel: 'Terms of Use',
    description:
      'Terms for using this catalog and buying replica IWC watches: what we sell, how QC and checkout work, and the limits of the store’s responsibility.',
    intro:
      'These terms govern use of this website and every order placed through it. By browsing, creating a checkout, or paying, you agree to this page together with the [shipping policy](/shipping-policy/), [return & refund](/returns-refunds/), [warranty policy](/warranty-policy/), and [privacy policy](/privacy-policy/). If you do not agree, do not place an order.',
    updated: POLICY_UPDATED,
    updatedIso: POLICY_UPDATED_ISO,
    highlights: [
      { value: 'Replicas', label: 'Independent pieces, not IWC manufacture stock' },
      { value: 'QC', label: 'You approve the allocated watch before it ships' },
      { value: 'Listed specs', label: 'The product page is the contract for that SKU' },
    ],
    sections: [
      {
        id: 'what-we-sell',
        title: 'What we sell',
        blocks: [
          {
            type: 'p',
            text: 'This store sells replica IWC watches in the collections listed on the site: Pilot, Big Pilot, Portugieser, Portofino, Ingenieur, Aquatimer, and related families in the [collections](/collections/) index. Each listing is a replica that follows the look of a named reference. It is not a genuine IWC watch, not an authorized dealer piece, and not covered by an IWC international warranty.',
          },
          {
            type: 'p',
            text: 'Titles, photos, grades, and prices describe the replica as offered here. Store grades such as Top 1:1 Clone are this catalog’s labels. They are not IWC factory grades. Finish, weight, and after-sales support will not match a boutique purchase. If a specification is not on the product page, do not assume it.',
          },
        ],
      },
      {
        id: 'eligibility',
        title: 'Who may order',
        blocks: [
          {
            type: 'p',
            text: 'You must be old enough to form a contract in your country and able to accept delivery at the address you give. You are responsible for whether importing a replica watch is allowed where you live. We do not provide legal advice. If your local rules prohibit the goods, do not order.',
          },
        ],
      },
      {
        id: 'catalog',
        title: 'Catalog, prices, and availability',
        blocks: [
          {
            type: 'p',
            text: 'Prices are shown in the currency on the product page and at checkout. We may correct an obvious pricing error before dispatch and will contact you if that happens. Stock, dial options, and strap or bracelet notes can change. An order is an offer to buy; we accept it when payment clears and we allocate a watch for QC.',
          },
        ],
      },
      {
        id: 'orders-qc',
        title: 'Orders, payment, and QC',
        blocks: [
          {
            type: 'p',
            text: 'Checkout is completed with the payment method shown there (currently flypay). When payment is confirmed, we inspect the allocated watch, test functions, and send you a QC video. Shipment follows your approval, as described in [shipping](/shipping-policy/) and on the homepage purchasing journey. If we cannot source a piece that matches the listing, we will refund amounts paid for that order.',
          },
        ],
      },
      {
        id: 'your-responsibilities',
        title: 'Your responsibilities',
        blocks: [
          {
            type: 'ul',
            items: [
              'Provide a complete, deliverable address and a phone number the courier can use.',
              'Review QC promptly and say clearly if you reject the piece.',
              'Do not present the watch as genuine IWC, as boutique stock, or as having an AP manufacture warranty.',
              'Use the watch in line with the [warranty policy](/warranty-policy/). Water, shocks, and third-party service can void coverage.',
            ],
          },
        ],
      },
      {
        id: 'ip',
        title: 'Intellectual property and site content',
        blocks: [
          {
            type: 'p',
            text: 'IWC, Pilot, Portugieser, Portofino, and related marks belong to their owners. This storefront uses collection names so you can find the replica reference you want. It is not affiliated with, endorsed by, or operated by IWC Schaffhausen. Product photos, QC clips, and copy on this site are provided to describe our goods. You may not scrape the catalog, copy QC media for another shop, or reuse our product descriptions as your own listings.',
          },
        ],
      },
      {
        id: 'acceptable-use',
        title: 'Acceptable use of the website',
        blocks: [
          {
            type: 'p',
            text: 'Do not attack the site, probe admin tools, overload checkout, or submit false orders. Do not upload unlawful content through contact channels. We may refuse or cancel an order that looks fraudulent, that we cannot ship, or that violates these terms.',
          },
        ],
      },
      {
        id: 'liability',
        title: 'Limitation of liability',
        blocks: [
          {
            type: 'p',
            text: 'To the fullest extent allowed by law, we are not liable for indirect, incidental, or consequential loss, including lost time, lost profit, or data loss. For a paid order, our total liability is limited to the amount you paid for that order. Nothing in these terms excludes liability that cannot be excluded in your jurisdiction, including for fraud or for personal injury caused by negligence where that bar applies.',
          },
          {
            type: 'p',
            text: 'Watches are mechanical objects. Accuracy, water resistance, and cosmetic wear after delivery depend on use. Pre-shipment QC and the movement warranty are the remedies we offer, together with the 14-day return request window.',
          },
        ],
      },
      {
        id: 'changes-law',
        title: 'Changes and governing language',
        blocks: [
          {
            type: 'p',
            text: 'We may update these terms for new checkout tools, collections, or shipping practice. The date on this page is the current version and applies to orders placed after it is published. These terms are written in English. If a translation is shown, the English text controls unless a mandatory local law says otherwise.',
          },
        ],
      },
    ],
  },
  {
    id: 'warranty',
    path: '/warranty-policy/',
    title: 'Warranty Policy',
    navLabel: 'Warranty Policy',
    description:
      'One-year movement warranty on replica IWC watches sold here: what it covers, what it excludes, and how to open a claim after delivery.',
    intro:
      'Every watch we ship includes a one-year movement warranty from the delivery date. It is a store warranty on the replica you bought. It is not an IWC manufacture warranty, not a boutique international card, and not a promise that the piece is genuine AP.',
    updated: POLICY_UPDATED,
    updatedIso: POLICY_UPDATED_ISO,
    highlights: [
      { value: '1 year', label: 'Movement coverage from the delivery date' },
      { value: 'Store terms', label: 'Repair or replace at our discretion' },
      { value: 'Normal use', label: 'No water damage, knocks, or third-party service' },
    ],
    sections: [
      {
        id: 'coverage',
        title: 'What the warranty covers',
        blocks: [
          {
            type: 'p',
            text: 'If the movement stops, runs unreasonably fast or slow under normal wear, or a listed complication on that SKU fails without misuse, contact us inside the one-year window. Coverage is for mechanical function of the movement as described on the product page. We will repair the watch or replace it with the same reference when stock allows. If neither is practical, we may refund the product price instead.',
          },
          {
            type: 'p',
            text: 'QC before shipping is separate. The warranty starts when tracking shows delivered, after you have already approved the inspection video.',
          },
        ],
      },
      {
        id: 'exclusions',
        title: 'What the warranty does not cover',
        blocks: [
          {
            type: 'ul',
            items: [
              'Water or moisture damage, fogged crystals, or use beyond any water-resistance note on the listing.',
              'Cracks, chips, dents, stretched bracelets, broken clasps, worn plating, or other physical damage from knocks, chemicals, or daily abrasion.',
              'Straps, rubber, leather, and cosmetic finishing once the watch has been worn.',
              'Batteries on any quartz piece, if that movement type is listed for the SKU.',
              'Work done by a third-party watchmaker, or any attempt to open the case back yourself.',
              'Loss, theft, or a watch that does not match the QC record because parts were swapped after delivery.',
            ],
          },
        ],
      },
      {
        id: 'not-ap',
        title: 'Not an IWC warranty',
        blocks: [
          {
            type: 'p',
            text: 'Papers, cards, or boxes that ship with a replica are store or presentation items. They do not enroll the watch with IWC. An IWC service centre will not honour this warranty. Saying so in the listing is intentional: you are buying a replica with the after-sales terms on this page.',
          },
        ],
      },
      {
        id: 'how-to-claim',
        title: 'How to make a claim',
        blocks: [
          {
            type: 'ol',
            items: [
              'Write through [contact](/contact/) with your order email, the reference, the delivery date, and a description of the fault.',
              'Send a video that shows the issue (for example the seconds hand stopped, a chronograph pusher that does not reset, or a date that does not change).',
              'Wait for a claim decision. If we need the watch, we will send a return address. Use tracked, insured shipping and pack the piece as you received it.',
              'We inspect the movement against misuse. If the claim is accepted, we repair or replace. If it is declined, we explain why and can return the watch.',
            ],
          },
          {
            type: 'p',
            text: 'Return shipping for a valid movement claim is discussed when we accept the claim. Outbound reshipment of a repaired or replacement watch uses the same discreet, tracked method described in the [shipping policy](/shipping-policy/).',
          },
        ],
      },
      {
        id: 'water',
        title: 'Water resistance',
        blocks: [
          {
            type: 'p',
            text: 'Any water-resistance figure on a replica listing is a catalog note, not a laboratory certificate from IWC. Do not swim, shower, or operate pushers underwater unless the product page clearly supports that use and the crown is seated. Moisture damage is outside this warranty.',
          },
        ],
      },
      {
        id: 'after',
        title: 'After the first year',
        blocks: [
          {
            type: 'p',
            text: 'When the year ends, movement work is chargeable if we still have parts and capacity. Ask before you send the watch. Cosmetic refinishing is never included in the movement warranty.',
          },
        ],
      },
    ],
  },
  {
    id: 'disclaimer',
    path: '/disclaimer/',
    title: 'Disclaimer',
    navLabel: 'Disclaimer',
    description:
      'These watches are replica IWC designs, not genuine IWC Schaffhausen products. We are not affiliated with IWC.',
    intro:
      'This catalog sells replica IWC watches. They are independent pieces inspired by named IWC references. They are not genuine IWC Schaffhausen watches, not authorized dealer stock, and not covered by an IWC international warranty. Guides and blog pages on this site describe replica buying, not boutique authenticity.',
    updated: POLICY_UPDATED,
    updatedIso: POLICY_UPDATED_ISO,
    highlights: [
      { value: 'Replica', label: 'Not a genuine IWC manufacture watch' },
      { value: 'Independent', label: 'No affiliation with IWC Schaffhausen' },
      { value: 'Guides', label: 'Editorial pages describe replica buying' },
    ],
    sections: [
      {
        id: 'affiliation',
        title: 'No affiliation',
        blocks: [
          {
            type: 'p',
            text: 'IWC, IWC Schaffhausen, and related model names are used only to describe the design language of the replica we sell. We are not a boutique, authorized dealer, service center, or partner of Richemont or IWC. Trademarks belong to their owners.',
          },
        ],
      },
      {
        id: 'editorial',
        title: 'Guides and blog',
        blocks: [
          {
            type: 'p',
            text: 'Guides and blog articles are informational. They are not a certificate of authenticity, a laboratory report, or legal advice. Product pages remain the contract for a SKU. If a specification is not on the product page, do not assume it.',
          },
        ],
      },
      {
        id: 'import',
        title: 'Import and local law',
        blocks: [
          {
            type: 'p',
            text: 'You are responsible for whether importing a replica watch is allowed where you live. If your local rules prohibit the goods, do not order. See also the [terms of use](/terms/) and [privacy policy](/privacy-policy/).',
          },
        ],
      },
    ],
  },
];

export const policyNav = policies.map((policy) => ({
  href: policy.path,
  label: policy.navLabel,
}));

export function getPolicy(id: string): PolicyPageContent {
  const policy = policies.find((item) => item.id === id);
  if (!policy) {
    throw new Error(`Unknown policy: ${id}`);
  }
  return policy;
}

export function relatedPolicies(id: string) {
  return policies.filter((item) => item.id !== id);
}
