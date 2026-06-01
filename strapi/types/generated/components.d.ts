import type { Attribute, Schema } from '@strapi/strapi';

export interface CinemaDayPrice extends Schema.Component {
  collectionName: 'components_cinema_day_prices';
  info: {
    description: '\u039A\u03B1\u03BD\u03BF\u03BD\u03B9\u03BA\u03AE \u03BA\u03B1\u03B9 \u03BC\u03B5\u03B9\u03C9\u03BC\u03AD\u03BD\u03B7/\u03C6\u03BF\u03B9\u03C4\u03B7\u03C4\u03B9\u03BA\u03AE \u03C4\u03B9\u03BC\u03AE \u03B3\u03B9\u03B1 \u03C3\u03C5\u03B3\u03BA\u03B5\u03BA\u03C1\u03B9\u03BC\u03AD\u03BD\u03B7 \u03B7\u03BC\u03AD\u03C1\u03B1 \u03B5\u03B2\u03B4\u03BF\u03BC\u03AC\u03B4\u03B1\u03C2.';
    displayName: '\u03A4\u03B9\u03BC\u03AE \u03B7\u03BC\u03AD\u03C1\u03B1\u03C2';
  };
  attributes: {
    price: Attribute.Decimal & Attribute.Required;
    price_student: Attribute.Decimal;
    weekday: Attribute.Enumeration<
      [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday'
      ]
    > &
      Attribute.Required;
  };
}

export interface HomeLayoutSection extends Schema.Component {
  collectionName: 'components_home_layout_sections';
  info: {
    description: '\u03A0\u03C1\u03CC\u03C3\u03B8\u03B5\u03C3\u03B5 \u03BC\u03CC\u03BD\u03BF \u03CC\u03C3\u03B1 \u03B8\u03AD\u03BB\u03B5\u03B9\u03C2 (2\u20134 \u03C4\u03C5\u03C0\u03B9\u03BA\u03AC). \u03A3\u03B5\u03B9\u03C1\u03AC = \u03C3\u03B5\u03B9\u03C1\u03AC \u03B5\u03BC\u03C6\u03AC\u03BD\u03B9\u03C3\u03B7\u03C2. movies_today=\u03C4\u03B1\u03B9\u03BD\u03AF\u03B5\u03C2 \u03BC\u03B5 \u03C0\u03C1\u03BF\u03B2\u03BF\u03BB\u03AE \u03C3\u03AE\u03BC\u03B5\u03C1\u03B1, summer_cinema=\u03B8\u03B5\u03C1\u03B9\u03BD\u03AD\u03C2 \u03C4\u03B1\u03B9\u03BD\u03AF\u03B5\u03C2, summer_venues=\u03C7\u03CE\u03C1\u03BF\u03B9 \u03BC\u03B5 \u03C3\u03AE\u03BC\u03B1 \u03B8\u03B5\u03C1\u03B9\u03BD\u03BF\u03CD CMS, tours=\u03C0\u03B5\u03C1\u03B9\u03BF\u03B4\u03B5\u03AF\u03B5\u03C2 \u03B8\u03B5\u03AC\u03C4\u03C1\u03BF\u03C5, new_movies=\u03BD\u03AD\u03B5\u03C2 \u03BA\u03C5\u03BA\u03BB\u03BF\u03C6\u03BF\u03C1\u03AF\u03B5\u03C2 (10 \u03B7\u03BC\u03AD\u03C1\u03B5\u03C2), movies_week=\u03B5\u03C1\u03C7\u03CC\u03BC\u03B5\u03BD\u03B7 \u03B5\u03B2\u03B4\u03BF\u03BC\u03AC\u03B4\u03B1 \u03BA\u03B9\u03BD\u03B7\u03BC\u03B1\u03C4\u03BF\u03B3\u03C1\u03AC\u03C6\u03BF\u03C5 (\u03A0\u03AD\u03BC\u2013\u03A4\u03B5\u03C4), coming_soon=\u03BA\u03C5\u03BA\u03BB\u03BF\u03C6\u03BF\u03C1\u03AF\u03B5\u03C2 \u03BC\u03B5\u03C4\u03AC \u03B1\u03C0\u03CC \u03B1\u03C5\u03C4\u03AE \u03C4\u03B7\u03BD \u03B5\u03B2\u03B4\u03BF\u03BC\u03AC\u03B4\u03B1.';
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

export interface NavigationNavItem extends Schema.Component {
  collectionName: 'components_navigation_nav_items';
  info: {
    description: '\u0395\u03C4\u03B9\u03BA\u03AD\u03C4\u03B1 \u03BA\u03B1\u03B9 \u03B4\u03B9\u03B1\u03B4\u03C1\u03BF\u03BC\u03AE (\u03C0.\u03C7. /movies). \u03A3\u03B5\u03B9\u03C1\u03AC = \u03C3\u03B5\u03B9\u03C1\u03AC \u03B5\u03BC\u03C6\u03AC\u03BD\u03B9\u03C3\u03B7\u03C2. \u0395\u03B9\u03BA\u03BF\u03BD\u03AF\u03B4\u03B9\u03BF \u03B3\u03B9\u03B1 \u03C4\u03B7\u03BD \u03BA\u03AC\u03C4\u03C9 \u03BC\u03C0\u03AC\u03C1\u03B1 \u03BA\u03B9\u03BD\u03B7\u03C4\u03BF\u03CD.';
    displayName: '\u03A3\u03CD\u03BD\u03B4\u03B5\u03C3\u03BC\u03BF\u03C2 \u03BC\u03B5\u03BD\u03BF\u03CD';
  };
  attributes: {
    icon: Attribute.Enumeration<
      ['home', 'film', 'theater', 'dining', 'venues', 'user', 'none']
    > &
      Attribute.DefaultTo<'none'>;
    label: Attribute.String & Attribute.Required;
    path: Attribute.String & Attribute.Required;
    show_on_desktop: Attribute.Boolean & Attribute.DefaultTo<true>;
    show_on_mobile_tab: Attribute.Boolean & Attribute.DefaultTo<false>;
  };
}

export interface SchedulingSkipDay extends Schema.Component {
  collectionName: 'components_scheduling_skip_days';
  info: {
    description: '\u0394\u03B5\u03BD \u03B4\u03B7\u03BC\u03B9\u03BF\u03C5\u03C1\u03B3\u03B5\u03AF\u03C4\u03B1\u03B9 (\u03AE \u03B4\u03B9\u03B1\u03B3\u03C1\u03AC\u03C6\u03B5\u03C4\u03B1\u03B9) \u03C0\u03C1\u03BF\u03B2\u03BF\u03BB\u03AE \u03B1\u03C5\u03C4\u03AE \u03C4\u03B7\u03BD \u03B7\u03BC\u03B5\u03C1\u03BF\u03BC\u03B7\u03BD\u03AF\u03B1 \u03BC\u03AD\u03C3\u03B1 \u03C3\u03C4\u03BF \u03B4\u03B9\u03AC\u03C3\u03C4\u03B7\u03BC\u03B1 \u03B5\u03C0\u03B1\u03BD\u03AC\u03BB\u03B7\u03C8\u03B7\u03C2.';
    displayName: '\u0397\u03BC\u03AD\u03C1\u03B1 \u03B5\u03BE\u03B1\u03AF\u03C1\u03B5\u03C3\u03B7\u03C2';
  };
  attributes: {
    day: Attribute.Date & Attribute.Required;
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
      'cinema.day-price': CinemaDayPrice;
      'home.layout-section': HomeLayoutSection;
      'navigation.nav-item': NavigationNavItem;
      'scheduling.skip-day': SchedulingSkipDay;
      'shared.cast-name': SharedCastName;
    }
  }
}
