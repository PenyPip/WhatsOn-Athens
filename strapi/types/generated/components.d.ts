import type { Attribute, Schema } from '@strapi/strapi';

export interface HomeLayoutSection extends Schema.Component {
  collectionName: 'components_home_layout_sections';
  info: {
    description: '\u03A0\u03C1\u03CC\u03C3\u03B8\u03B5\u03C3\u03B5 \u03BC\u03CC\u03BD\u03BF \u03CC\u03C3\u03B1 \u03B8\u03AD\u03BB\u03B5\u03B9\u03C2 (2\u20134 \u03C4\u03C5\u03C0\u03B9\u03BA\u03AC). \u03A3\u03B5\u03B9\u03C1\u03AC = \u03C3\u03B5\u03B9\u03C1\u03AC \u03B5\u03BC\u03C6\u03AC\u03BD\u03B9\u03C3\u03B7\u03C2. movies_today=\u03C4\u03B1\u03B9\u03BD\u03AF\u03B5\u03C2 \u03BC\u03B5 \u03C0\u03C1\u03BF\u03B2\u03BF\u03BB\u03AE \u03C3\u03AE\u03BC\u03B5\u03C1\u03B1, summer_cinema=\u03B8\u03B5\u03C1\u03B9\u03BD\u03AD\u03C2 \u03C4\u03B1\u03B9\u03BD\u03AF\u03B5\u03C2, summer_venues=\u03C7\u03CE\u03C1\u03BF\u03B9 \u03BC\u03B5 \u03C3\u03AE\u03BC\u03B1 \u03B8\u03B5\u03C1\u03B9\u03BD\u03BF\u03CD CMS, tours=\u03C0\u03B5\u03C1\u03B9\u03BF\u03B4\u03B5\u03AF\u03B5\u03C2 \u03B8\u03B5\u03AC\u03C4\u03C1\u03BF\u03C5, new_movies=\u03BD\u03AD\u03B5\u03C2 \u03BA\u03C5\u03BA\u03BB\u03BF\u03C6\u03BF\u03C1\u03AF\u03B5\u03C2 \u03B2\u03AC\u03C3\u03B5\u03B9 \u03B7\u03BC\u03B5\u03C1\u03BF\u03BC\u03B7\u03BD\u03AF\u03B1\u03C2 \u03BA\u03C5\u03BA\u03BB\u03BF\u03C6\u03BF\u03C1\u03AF\u03B1\u03C2, movies_week=\u03C0\u03C1\u03BF\u03B2\u03BF\u03BB\u03AD\u03C2 \u03B1\u03C5\u03C4\u03AE\u03C2 \u03C4\u03B7\u03C2 \u03B5\u03B2\u03B4\u03BF\u03BC\u03AC\u03B4\u03B1\u03C2.';
    displayName: '\u039C\u03C0\u03BB\u03BF\u03BA \u03B1\u03C1\u03C7\u03B9\u03BA\u03AE\u03C2';
  };
  attributes: {
    section_key: Attribute.Enumeration<
      [
        'hero',
        'strip',
        'movies_today',
        'summer_cinema',
        'summer_venues',
        'tours',
        'new_movies',
        'movies_week',
        'coming_soon',
        'dining',
        'newsletter'
      ]
    > &
      Attribute.Required;
    visible: Attribute.Boolean & Attribute.DefaultTo<true>;
  };
}

export interface SharedCastName extends Schema.Component {
  collectionName: 'components_shared_cast_names';
  info: {
    description: '\u0388\u03BD\u03B1 \u03CC\u03BD\u03BF\u03BC\u03B1 \u03B1\u03BD\u03AC \u03B3\u03C1\u03B1\u03BC\u03BC\u03AE. \u03A3\u03C4\u03BF Admin: \u00AB\u03A0\u03C1\u03BF\u03C3\u03B8\u03AE\u03BA\u03B7 \u03BD\u03AD\u03B1\u03C2 \u03B5\u03B3\u03B3\u03C1\u03B1\u03C6\u03AE\u03C2\u00BB \u03B3\u03B9\u03B1 \u03BA\u03AC\u03B8\u03B5 \u03B7\u03B8\u03BF\u03C0\u03BF\u03B9\u03CC \u2014 \u03C7\u03C9\u03C1\u03AF\u03C2 JSON \u03AE \u03BA\u03CC\u03BC\u03BC\u03B1\u03C4\u03B1.';
    displayName: '\u0397\u03B8\u03BF\u03C0\u03BF\u03B9\u03CC\u03C2';
  };
  attributes: {
    person_name: Attribute.String & Attribute.Required;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'home.layout-section': HomeLayoutSection;
      'shared.cast-name': SharedCastName;
    }
  }
}
