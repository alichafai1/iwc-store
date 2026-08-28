import type { Product, ProductPageData } from '../types/product';
import { DEFAULT_QUALITY } from '../lib/qualities';
import { getAllPlaceholderProducts, getPlaceholderProduct } from './products';

const galleryImages = getAllPlaceholderProducts()
  .map((product) => product.image)
  .filter((image, index, images) => images.findIndex((item) => item.src === image.src) === index);

export function buildProductPage(product: Product): ProductPageData {
  const images = [product.image, ...galleryImages.filter((image) => image.src !== product.image.src)]
    .slice(0, 4)
    .map((image, index) => ({
      src: image,
      alt:
        index === 0
          ? product.imageAlt
          : `${product.title} placeholder view ${index + 1}`,
    }));

  return {
    source: 'placeholder',
    product,
    path: `/products/${product.slug}/`,
    metaTitle: product.title,
    metaDescription: `${product.title} from the ${product.collection} collection. Placeholder product page for layout and SEO structure.`,
    images,
    qualities: [
      {
        id: DEFAULT_QUALITY,
        label: DEFAULT_QUALITY,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
      },
    ],
    specs: [
      { label: 'Collection', value: product.collection },
      { label: 'Model', value: product.title },
      { label: 'Case', value: 'Placeholder case details' },
      { label: 'Movement', value: 'Placeholder movement details' },
      { label: 'Dial', value: 'Placeholder dial details' },
      { label: 'Strap', value: 'Placeholder strap details' },
      { label: 'Water resistance', value: 'Placeholder rating' },
    ],
    about: {
      heading: `About ${product.title}`,
      paragraphs: [
        `This is placeholder copy for ${product.title}. Replace it with the final product description when the catalog is connected.`,
        `The text is here so the heading, paragraph length, and SEO block can be reviewed. Keep the finished version factual and specific to this model.`,
        `Do not leave promotional claims that cannot be verified. This paragraph is temporary layout content only.`,
      ],
      sections: [
        {
          heading: 'Details',
          paragraphs: [
            `Use this optional heading for a shorter ${product.collection} note, such as finishing or intended use. The copy here is temporary.`,
          ],
        },
      ],
    },
    features: [
      'Placeholder feature for layout review',
      'Replace with a verified product detail',
      'Consistent finishing notes can go here',
      'Strap and clasp details can go here',
      'Movement notes can go here',
      'Service and support notes can go here',
    ],
    reviews: [
      {
        title: 'Placeholder review title',
        author: 'Sample reviewer A',
        date: '12 January 2026',
        rating: 5,
        body: 'Temporary review text for layout testing. This is not a customer statement.',
      },
      {
        title: 'Placeholder review title',
        author: 'Sample reviewer B',
        date: '3 February 2026',
        rating: 4,
        body: 'Temporary review text for spacing and typography. This is not a customer statement.',
      },
      {
        title: 'Placeholder review title',
        author: 'Sample reviewer C',
        date: '18 March 2026',
        rating: 5,
        body: 'Temporary review text for the reviews module. This is not a customer statement.',
      },
    ],
    faqs: [
      {
        question: `What is ${product.title}?`,
        answer: `${product.title} is a placeholder listing in the ${product.collection} collection. Replace this answer with a short, factual product description.`,
      },
      {
        question: `Which version should I choose for ${product.title}?`,
        answer: `${product.title} is offered as ${DEFAULT_QUALITY}. Price and compare-at price are shown for that quality.`,
      },
      {
        question: `What details are listed for ${product.title}?`,
        answer:
          'The specifications table and feature list are placeholder fields. Replace them with the details available for this piece.',
      },
      {
        question: `Is ${product.title} available now?`,
        answer: 'Availability is not connected yet. This page is for layout and SEO structure only.',
      },
      {
        question: `Do you ship ${product.title} internationally?`,
        answer:
          'Worldwide shipping is planned for qualifying orders. Delivery options will be shown at checkout and in the shipping policy.',
      },
      {
        question: `Can I return ${product.title}?`,
        answer: 'Returns will follow the terms in the returns policy. Use the contact page if you need help with an order.',
      },
      {
        question: `How do I ask a question about ${product.title}?`,
        answer:
          'Use the contact page and mention the product name and collection. Include an order number if you already have one.',
      },
    ],
    currency: 'USD',
  };
}

export function getProductPage(slug: string): ProductPageData {
  const product = getPlaceholderProduct(slug);

  if (!product) {
    throw new Error(`Missing product page data for ${slug}`);
  }

  return buildProductPage(product);
}

export function getProductPages(): ProductPageData[] {
  return getAllPlaceholderProducts().map(buildProductPage);
}
