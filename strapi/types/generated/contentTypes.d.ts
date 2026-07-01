import type { Attribute, Schema } from '@strapi/strapi';

export interface AdminApiToken extends Schema.CollectionType {
  collectionName: 'strapi_api_tokens';
  info: {
    description: '';
    displayName: 'Api Token';
    name: 'Api Token';
    pluralName: 'api-tokens';
    singularName: 'api-token';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::api-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    description: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Attribute.DefaultTo<''>;
    expiresAt: Attribute.DateTime;
    lastUsedAt: Attribute.DateTime;
    lifespan: Attribute.BigInteger;
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Attribute.Relation<
      'admin::api-token',
      'oneToMany',
      'admin::api-token-permission'
    >;
    type: Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
      Attribute.Required &
      Attribute.DefaultTo<'read-only'>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'admin::api-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Schema.CollectionType {
  collectionName: 'strapi_api_token_permissions';
  info: {
    description: '';
    displayName: 'API Token Permission';
    name: 'API Token Permission';
    pluralName: 'api-token-permissions';
    singularName: 'api-token-permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::api-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    token: Attribute.Relation<
      'admin::api-token-permission',
      'manyToOne',
      'admin::api-token'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'admin::api-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminPermission extends Schema.CollectionType {
  collectionName: 'admin_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'Permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Attribute.JSON & Attribute.DefaultTo<{}>;
    conditions: Attribute.JSON & Attribute.DefaultTo<[]>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    properties: Attribute.JSON & Attribute.DefaultTo<{}>;
    role: Attribute.Relation<'admin::permission', 'manyToOne', 'admin::role'>;
    subject: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'admin::permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminRole extends Schema.CollectionType {
  collectionName: 'admin_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'Role';
    pluralName: 'roles';
    singularName: 'role';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'admin::role', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    description: Attribute.String;
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Attribute.Relation<
      'admin::role',
      'oneToMany',
      'admin::permission'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<'admin::role', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    users: Attribute.Relation<'admin::role', 'manyToMany', 'admin::user'>;
  };
}

export interface AdminTransferToken extends Schema.CollectionType {
  collectionName: 'strapi_transfer_tokens';
  info: {
    description: '';
    displayName: 'Transfer Token';
    name: 'Transfer Token';
    pluralName: 'transfer-tokens';
    singularName: 'transfer-token';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::transfer-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    description: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Attribute.DefaultTo<''>;
    expiresAt: Attribute.DateTime;
    lastUsedAt: Attribute.DateTime;
    lifespan: Attribute.BigInteger;
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Attribute.Relation<
      'admin::transfer-token',
      'oneToMany',
      'admin::transfer-token-permission'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'admin::transfer-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminTransferTokenPermission extends Schema.CollectionType {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    description: '';
    displayName: 'Transfer Token Permission';
    name: 'Transfer Token Permission';
    pluralName: 'transfer-token-permissions';
    singularName: 'transfer-token-permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::transfer-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    token: Attribute.Relation<
      'admin::transfer-token-permission',
      'manyToOne',
      'admin::transfer-token'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'admin::transfer-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminUser extends Schema.CollectionType {
  collectionName: 'admin_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'User';
    pluralName: 'users';
    singularName: 'user';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    blocked: Attribute.Boolean & Attribute.Private & Attribute.DefaultTo<false>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'admin::user', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    email: Attribute.Email &
      Attribute.Required &
      Attribute.Private &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    firstname: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    isActive: Attribute.Boolean &
      Attribute.Private &
      Attribute.DefaultTo<false>;
    lastname: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    password: Attribute.Password &
      Attribute.Private &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    preferedLanguage: Attribute.String;
    registrationToken: Attribute.String & Attribute.Private;
    resetPasswordToken: Attribute.String & Attribute.Private;
    roles: Attribute.Relation<'admin::user', 'manyToMany', 'admin::role'> &
      Attribute.Private;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<'admin::user', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    username: Attribute.String;
  };
}

export interface ApiArticleArticle extends Schema.CollectionType {
  collectionName: 'articles';
  info: {
    displayName: 'Article';
    pluralName: 'articles';
    singularName: 'article';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    article_type: Attribute.Enumeration<
      [
        'kritiki_parastasis',
        'kritiki_tainias',
        'sigkrisi',
        'giati_na_deis',
        'politistiko_keimeno'
      ]
    >;
    content: Attribute.RichText &
      Attribute.CustomField<
        'plugin::ckeditor5.CKEditor',
        {
          preset: 'articleSimple';
        }
      >;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::article.article',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    featured_image: Attribute.Media<'images'>;
    featured_image_alt: Attribute.String;
    focus_keyword: Attribute.String;
    meta_description: Attribute.String;
    publishedAt: Attribute.DateTime;
    related_event: Attribute.Relation<
      'api::article.article',
      'manyToOne',
      'api::event.event'
    >;
    related_movie: Attribute.Relation<
      'api::article.article',
      'manyToOne',
      'api::movie.movie'
    >;
    related_theater_show: Attribute.Relation<
      'api::article.article',
      'manyToOne',
      'api::theater-show.theater-show'
    >;
    secondary_keywords: Attribute.String;
    slug: Attribute.UID<'api::article.article', 'title'> & Attribute.Required;
    tags: Attribute.Component<'shared.article-tag', true>;
    title: Attribute.String & Attribute.Required;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::article.article',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCuisineCuisine extends Schema.CollectionType {
  collectionName: 'cuisines';
  info: {
    description: '\u03A4\u03CD\u03C0\u03BF\u03B9 \u03BA\u03BF\u03C5\u03B6\u03AF\u03BD\u03B1\u03C2 \u03B3\u03B9\u03B1 \u03B5\u03C3\u03C4\u03B9\u03B1\u03C4\u03CC\u03C1\u03B9\u03B1\u00B7 \u03B5\u03C0\u03B9\u03BB\u03BF\u03B3\u03AE \u03B1\u03C0\u03CC dropdown \u03C3\u03C4\u03BF Restaurant \u03BA\u03B1\u03B9 \u03C6\u03AF\u03BB\u03C4\u03C1\u03BF \u03C3\u03C4\u03B7 \u03C3\u03B5\u03BB\u03AF\u03B4\u03B1 \u03A6\u03B1\u03B3\u03B7\u03C4\u03CC.';
    displayName: '\u039A\u03BF\u03C5\u03B6\u03AF\u03BD\u03B1';
    pluralName: 'cuisines';
    singularName: 'cuisine';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::cuisine.cuisine',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    label: Attribute.String & Attribute.Required;
    restaurants: Attribute.Relation<
      'api::cuisine.cuisine',
      'oneToMany',
      'api::restaurant.restaurant'
    >;
    slug: Attribute.UID<'api::cuisine.cuisine', 'label'> & Attribute.Required;
    sort_order: Attribute.Integer & Attribute.DefaultTo<0>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::cuisine.cuisine',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiEditorialReviewEditorialReview
  extends Schema.CollectionType {
  collectionName: 'editorial_reviews';
  info: {
    displayName: 'Editorial Review';
    pluralName: 'editorial-reviews';
    singularName: 'editorial-review';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    author: Attribute.String;
    author_image_url: Attribute.String;
    body: Attribute.RichText;
    category: Attribute.Enumeration<['movie', 'theater', 'restaurant']> &
      Attribute.Required;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::editorial-review.editorial-review',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    featured_image: Attribute.Media<'images'>;
    movie: Attribute.Relation<
      'api::editorial-review.editorial-review',
      'manyToOne',
      'api::movie.movie'
    >;
    publishedAt: Attribute.DateTime;
    restaurant: Attribute.Relation<
      'api::editorial-review.editorial-review',
      'manyToOne',
      'api::restaurant.restaurant'
    >;
    score: Attribute.Decimal;
    slug: Attribute.UID<'api::editorial-review.editorial-review', 'title'> &
      Attribute.Required;
    theater_show: Attribute.Relation<
      'api::editorial-review.editorial-review',
      'manyToOne',
      'api::theater-show.theater-show'
    >;
    title: Attribute.String & Attribute.Required;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::editorial-review.editorial-review',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiEventEvent extends Schema.CollectionType {
  collectionName: 'events';
  info: {
    description: '\u03A0\u03BF\u03BB\u03B9\u03C4\u03B9\u03C3\u03C4\u03B9\u03BA\u03AD\u03C2 \u03B5\u03BA\u03B4\u03B7\u03BB\u03CE\u03C3\u03B5\u03B9\u03C2 \u2014 \u03C0\u03BB\u03AE\u03C1\u03B7 \u03C3\u03C4\u03BF\u03B9\u03C7\u03B5\u03AF\u03B1, \u03C3\u03CD\u03BD\u03B4\u03B5\u03C3\u03B7 \u03BC\u03B5 \u03AC\u03C1\u03B8\u03C1\u03B1 \u03BA\u03B1\u03B9 featured picks.';
    displayName: 'Event';
    pluralName: 'events';
    singularName: 'event';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    articles: Attribute.Relation<
      'api::event.event',
      'oneToMany',
      'api::article.article'
    >;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::event.event',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    editorial_note_el: Attribute.Text;
    editorial_note_en: Attribute.Text;
    end_date: Attribute.Date;
    end_time: Attribute.Time;
    event_type: Attribute.Enumeration<
      ['cinema', 'theater', 'music', 'art', 'food', 'other']
    > &
      Attribute.Required &
      Attribute.DefaultTo<'other'>;
    featured: Attribute.Boolean & Attribute.DefaultTo<false>;
    language_subtitles: Attribute.String;
    meta_description: Attribute.String;
    online_link: Attribute.String;
    poster: Attribute.Media<'images'>;
    publishedAt: Attribute.DateTime;
    slug: Attribute.UID<'api::event.event', 'title_el'> & Attribute.Required;
    start_date: Attribute.Date;
    start_time: Attribute.Time;
    synopsis_el: Attribute.Text;
    synopsis_en: Attribute.Text;
    tags: Attribute.Component<'shared.article-tag', true>;
    ticket_price: Attribute.Decimal;
    ticket_url: Attribute.String;
    title_el: Attribute.String & Attribute.Required;
    title_en: Attribute.String;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::event.event',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    venue: Attribute.Relation<
      'api::event.event',
      'manyToOne',
      'api::venue.venue'
    >;
  };
}

export interface ApiHallHall extends Schema.CollectionType {
  collectionName: 'halls';
  info: {
    description: '\u0391\u03AF\u03B8\u03BF\u03C5\u03C3\u03B1/\u03BF\u03B8\u03CC\u03BD\u03B7 \u03C3\u03B5 \u03BA\u03B9\u03BD\u03B7\u03BC\u03B1\u03C4\u03BF\u03B3\u03C1\u03AC\u03C6\u03BF. \u03A3\u03C5\u03BD\u03B4\u03AD\u03B5\u03C4\u03B1\u03B9 \u03BC\u03B5 Venue\u00B7 \u03C3\u03C4\u03B9\u03C2 \u03A0\u03C1\u03BF\u03B2\u03BF\u03BB\u03AD\u03C2 \u03C4\u03B1\u03B9\u03BD\u03AF\u03B1\u03C2 \u03B5\u03C0\u03B9\u03BB\u03AD\u03B3\u03B5\u03C4\u03B1\u03B9 Venues + \u03C3\u03C5\u03B3\u03BA\u03B5\u03BA\u03C1\u03B9\u03BC\u03AD\u03BD\u03B7 \u03B1\u03AF\u03B8\u03BF\u03C5\u03C3\u03B1.';
    displayName: '\u0391\u03AF\u03B8\u03BF\u03C5\u03C3\u03B1';
    pluralName: 'halls';
    singularName: 'hall';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'api::hall.hall', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    name: Attribute.String & Attribute.Required;
    publishedAt: Attribute.DateTime;
    slug: Attribute.UID<'api::hall.hall', 'name'>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<'api::hall.hall', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    venue: Attribute.Relation<
      'api::hall.hall',
      'manyToOne',
      'api::venue.venue'
    >;
  };
}

export interface ApiHomepageHomepage extends Schema.SingleType {
  collectionName: 'homepage';
  info: {
    description: '\u03A3\u03B5\u03B9\u03C1\u03AC \u03BC\u03C0\u03BB\u03BF\u03BA \u03C3\u03C4\u03B7\u03BD \u03B1\u03C1\u03C7\u03B9\u03BA\u03AE (hero, \u03C4\u03B1\u03B9\u03BD\u03AF\u03B5\u03C2 \u03C3\u03AE\u03BC\u03B5\u03C1\u03B1, \u03B8\u03B5\u03C1\u03B9\u03BD\u03AC \u03BA.\u03BB\u03C0.). \u03A4\u03BF hero \u00AB\u03A0\u03BF\u03BB\u03C5\u03C3\u03C5\u03B6\u03B7\u03C4\u03B7\u03BC\u03AD\u03BD\u03B5\u03C2\u00BB \u03B5\u03BB\u03AD\u03B3\u03C7\u03B5\u03C4\u03B1\u03B9 \u03B1\u03C0\u03CC \u03C4\u03BF \u03C0\u03B5\u03B4\u03AF\u03BF most_talked_about \u03C3\u03B5 \u03BA\u03AC\u03B8\u03B5 \u03C4\u03B1\u03B9\u03BD\u03AF\u03B1.';
    displayName: '\u0391\u03C1\u03C7\u03B9\u03BA\u03AE \u03C3\u03B5\u03BB\u03AF\u03B4\u03B1';
    pluralName: 'homepages';
    singularName: 'homepage';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::homepage.homepage',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    layout_sections: Attribute.Component<'home.layout-section', true>;
    publishedAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::homepage.homepage',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiMovieGenreMovieGenre extends Schema.CollectionType {
  collectionName: 'movie_genres';
  info: {
    description: '\u0394\u03B9\u03B1\u03C7\u03B5\u03AF\u03C1\u03B9\u03C3\u03B7 \u03B5\u03B9\u03B4\u03CE\u03BD \u03B3\u03B9\u03B1 \u03C4\u03B9\u03C2 \u03C4\u03B1\u03B9\u03BD\u03AF\u03B5\u03C2\u00B7 \u03C1\u03CD\u03B8\u03BC\u03B9\u03C3\u03B5 \u03B5\u03C4\u03B9\u03BA\u03AD\u03C4\u03B1 \u03BA\u03B1\u03B9 \u03C3\u03B5\u03B9\u03C1\u03AC \u03B5\u03BC\u03C6\u03AC\u03BD\u03B9\u03C3\u03B7\u03C2 \u03C3\u03C4\u03B1 \u03C6\u03AF\u03BB\u03C4\u03C1\u03B1 \u03C4\u03BF\u03C5 site.';
    displayName: '\u0395\u03AF\u03B4\u03BF\u03C2 \u03C4\u03B1\u03B9\u03BD\u03AF\u03B1\u03C2';
    pluralName: 'movie-genres';
    singularName: 'movie-genre';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::movie-genre.movie-genre',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    label: Attribute.String & Attribute.Required;
    movies: Attribute.Relation<
      'api::movie-genre.movie-genre',
      'manyToMany',
      'api::movie.movie'
    >;
    slug: Attribute.UID<'api::movie-genre.movie-genre', 'label'> &
      Attribute.Required;
    sort_order: Attribute.Integer & Attribute.DefaultTo<0>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::movie-genre.movie-genre',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiMovieMovie extends Schema.CollectionType {
  collectionName: 'movies';
  info: {
    description: '\u0394\u03B7\u03BC\u03B9\u03BF\u03CD\u03C1\u03B3\u03B7\u03C3\u03B5 \u03C0\u03C1\u03CE\u03C4\u03B1 \u03C4\u03B7\u03BD \u03C4\u03B1\u03B9\u03BD\u03AF\u03B1. \u03A0\u03C1\u03CC\u03B3\u03C1\u03B1\u03BC\u03BC\u03B1 \u03B1\u03BD\u03AC \u03C3\u03B9\u03BD\u03B5\u03BC\u03AC: \u00AB\u03A0\u03C1\u03BF\u03B2\u03BF\u03BB\u03AE \u03C4\u03B1\u03B9\u03BD\u03AF\u03B1\u03C2\u00BB \u2014 \u03B5\u03AF\u03C4\u03B5 \u03B1\u03BA\u03C1\u03B9\u03B2\u03B5\u03AF\u03C2 \u03CE\u03C1\u03B5\u03C2, \u03B5\u03AF\u03C4\u03B5 \u00AB\u039F\u03BB\u03CC\u03BA\u03BB\u03B7\u03C1\u03B7 \u03B5\u03B2\u03B4\u03BF\u03BC\u03AC\u03B4\u03B1\u00BB \u03C7\u03C9\u03C1\u03AF\u03C2 \u03CE\u03C1\u03B5\u03C2 (\u03C4\u03CD\u03C0\u03BF\u03C2 schedule_kind).';
    displayName: '\u03A4\u03B1\u03B9\u03BD\u03AF\u03B1';
    pluralName: 'movies';
    singularName: 'movie';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    age_rating: Attribute.String;
    articles: Attribute.Relation<
      'api::movie.movie',
      'oneToMany',
      'api::article.article'
    >;
    cast: Attribute.Component<'shared.cast-name', true>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::movie.movie',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    critic_score: Attribute.Decimal;
    director: Attribute.String;
    duration: Attribute.Integer;
    editorial_reviews: Attribute.Relation<
      'api::movie.movie',
      'oneToMany',
      'api::editorial-review.editorial-review'
    >;
    event_group_code: Attribute.String;
    imdb_rating: Attribute.Decimal;
    is_dubbed: Attribute.Boolean & Attribute.DefaultTo<false>;
    language: Attribute.String;
    more_code_links: Attribute.Component<'cinema.more-code-link', true> &
      Attribute.Private;
    more_event_groups: Attribute.Component<'cinema.more-event-group', true>;
    more_event_ids: Attribute.Component<'cinema.more-event-id', true> &
      Attribute.Private;
    most_talked_about: Attribute.Boolean & Attribute.DefaultTo<false>;
    movie_genres: Attribute.Relation<
      'api::movie.movie',
      'manyToMany',
      'api::movie-genre.movie-genre'
    >;
    original_title: Attribute.String & Attribute.Required & Attribute.Unique;
    poster: Attribute.Media<'images'>;
    publishedAt: Attribute.DateTime;
    rejected_more_codes: Attribute.Component<
      'cinema.rejected-more-code',
      true
    > &
      Attribute.Private;
    release_date: Attribute.Date;
    reviews: Attribute.Relation<
      'api::movie.movie',
      'oneToMany',
      'api::user-review.user-review'
    >;
    showtimes: Attribute.Relation<
      'api::movie.movie',
      'oneToMany',
      'api::showtime.showtime'
    >;
    slug: Attribute.UID<'api::movie.movie', 'original_title'> &
      Attribute.Required;
    synopsis: Attribute.Text;
    title: Attribute.String & Attribute.Required;
    trailer_url: Attribute.String;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::movie.movie',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiRestaurantCategoryRestaurantCategory
  extends Schema.CollectionType {
  collectionName: 'restaurant_categories';
  info: {
    description: '\u03A4\u03CD\u03C0\u03BF\u03C2 \u03C7\u03CE\u03C1\u03BF\u03C5 (wine bar, bistro, \u03C6\u03BF\u03CD\u03C1\u03BD\u03BF\u03C2 \u03BA.\u03BB\u03C0.) \u2014 dropdown \u03C3\u03C4\u03BF Restaurant \u03BA\u03B1\u03B9 \u03C6\u03AF\u03BB\u03C4\u03C1\u03BF \u03C3\u03C4\u03B7 \u03C3\u03B5\u03BB\u03AF\u03B4\u03B1 \u03A6\u03B1\u03B3\u03B7\u03C4\u03CC.';
    displayName: '\u039A\u03B1\u03C4\u03B7\u03B3\u03BF\u03C1\u03AF\u03B1 \u03B5\u03C3\u03C4\u03B9\u03B1\u03C4\u03BF\u03C1\u03AF\u03BF\u03C5';
    pluralName: 'restaurant-categories';
    singularName: 'restaurant-category';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::restaurant-category.restaurant-category',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    label: Attribute.String & Attribute.Required;
    restaurants: Attribute.Relation<
      'api::restaurant-category.restaurant-category',
      'oneToMany',
      'api::restaurant.restaurant'
    >;
    slug: Attribute.UID<
      'api::restaurant-category.restaurant-category',
      'label'
    > &
      Attribute.Required;
    sort_order: Attribute.Integer & Attribute.DefaultTo<0>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::restaurant-category.restaurant-category',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiRestaurantRestaurant extends Schema.CollectionType {
  collectionName: 'restaurants';
  info: {
    displayName: 'Restaurant';
    pluralName: 'restaurants';
    singularName: 'restaurant';
  };
  attributes: {
    address: Attribute.String;
    category: Attribute.Relation<
      'api::restaurant.restaurant',
      'manyToOne',
      'api::restaurant-category.restaurant-category'
    >;
    city: Attribute.Enumeration<['athens', 'thessaloniki', 'other']>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::restaurant.restaurant',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    cuisine: Attribute.Relation<
      'api::restaurant.restaurant',
      'manyToOne',
      'api::cuisine.cuisine'
    >;
    district: Attribute.Enumeration<
      ['center', 'north', 'south', 'west', 'east', 'piraeus', 'greater_other']
    >;
    editorial_reviews: Attribute.Relation<
      'api::restaurant.restaurant',
      'oneToMany',
      'api::editorial-review.editorial-review'
    >;
    editorial_score: Attribute.Decimal;
    google_maps_url: Attribute.String;
    instagram: Attribute.String;
    is_new: Attribute.Boolean & Attribute.DefaultTo<true>;
    name: Attribute.String & Attribute.Required;
    neighborhood: Attribute.String;
    opening_date: Attribute.Date;
    phone: Attribute.String;
    poster: Attribute.Media<'images'>;
    price_range: Attribute.String;
    reviews: Attribute.Relation<
      'api::restaurant.restaurant',
      'oneToMany',
      'api::user-review.user-review'
    >;
    slug: Attribute.UID<'api::restaurant.restaurant', 'name'> &
      Attribute.Required;
    synopsis: Attribute.Text;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::restaurant.restaurant',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    website: Attribute.String;
  };
}

export interface ApiShowtimeShowtime extends Schema.CollectionType {
  collectionName: 'showtimes';
  info: {
    description: '\u039C\u03AF\u03B1 \u03C0\u03C1\u03BF\u03B2\u03BF\u03BB\u03AE = \u03AD\u03BD\u03B1 \u03C3\u03B9\u03BD\u03B5\u03BC\u03AC + \u03C7\u03CE\u03C1\u03BF\u03C2. \u0395\u03AF\u03B4\u03BF\u03C2 \u00AB\u0391\u03BA\u03C1\u03B9\u03B2\u03B5\u03AF\u03C2 \u03CE\u03C1\u03B5\u03C2\u00BB \u03AE \u00AB\u039F\u03BB\u03CC\u03BA\u03BB\u03B7\u03C1\u03B7 \u03B5\u03B2\u03B4\u03BF\u03BC\u03AC\u03B4\u03B1 (\u03C7\u03C9\u03C1\u03AF\u03C2 \u03CE\u03C1\u03B5\u03C2)\u00BB.';
    displayName: '\u03A0\u03C1\u03BF\u03B2\u03BF\u03BB\u03AE \u03C4\u03B1\u03B9\u03BD\u03AF\u03B1\u03C2';
    pluralName: 'showtimes';
    singularName: 'showtime';
  };
  attributes: {
    available_seats: Attribute.Integer;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::showtime.showtime',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    datetime: Attribute.DateTime & Attribute.Required;
    hall: Attribute.Relation<
      'api::showtime.showtime',
      'manyToOne',
      'api::hall.hall'
    >;
    import_source: Attribute.Enumeration<
      ['manual', 'more_sync', 'repeat_expand']
    > &
      Attribute.DefaultTo<'manual'>;
    import_trace: Attribute.Text;
    movie: Attribute.Relation<
      'api::showtime.showtime',
      'manyToOne',
      'api::movie.movie'
    >;
    price: Attribute.Decimal;
    repeat_skip_days: Attribute.Component<'scheduling.skip-day', true>;
    repeat_until: Attribute.Date;
    schedule_kind: Attribute.Enumeration<['exact', 'week_block']> &
      Attribute.Required &
      Attribute.DefaultTo<'exact'>;
    summer_screening: Attribute.Boolean & Attribute.DefaultTo<false>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::showtime.showtime',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    venue: Attribute.Relation<
      'api::showtime.showtime',
      'manyToOne',
      'api::venue.venue'
    >;
    week_end: Attribute.Date;
  };
}

export interface ApiSiteNavigationSiteNavigation extends Schema.SingleType {
  collectionName: 'site_navigations';
  info: {
    description: '\u03A3\u03CD\u03BD\u03B4\u03B5\u03C3\u03BC\u03BF\u03B9 navbar (desktop) \u03BA\u03B1\u03B9 \u03BA\u03AC\u03C4\u03C9 \u03BC\u03C0\u03AC\u03C1\u03B1\u03C2 \u03BA\u03B9\u03BD\u03B7\u03C4\u03BF\u03CD.';
    displayName: '\u039C\u03B5\u03BD\u03BF\u03CD \u03B9\u03C3\u03C4\u03BF\u03C4\u03CC\u03C0\u03BF\u03C5';
    pluralName: 'site-navigations';
    singularName: 'site-navigation';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    brand_tagline: Attribute.String &
      Attribute.DefaultTo<'Cinema \u00B7 Events \u00B7 Culture'>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::site-navigation.site-navigation',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    items: Attribute.Component<'navigation.nav-item', true>;
    publishedAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::site-navigation.site-navigation',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiTheaterPerformanceTheaterPerformance
  extends Schema.CollectionType {
  collectionName: 'theater_performances';
  info: {
    description: '\u039C\u03AF\u03B1 \u03B5\u03BC\u03C6\u03AC\u03BD\u03B9\u03C3\u03B7 = \u0398\u03AD\u03B1\u03C4\u03C1\u03BF + \u03C7\u03CE\u03C1\u03BF\u03C2 + \u03B7\u03BC\u03B5\u03C1\u03BF\u03BC\u03B7\u03BD\u03AF\u03B1/\u03CE\u03C1\u03B1 (\u03B1\u03BD\u03AC\u03BB\u03BF\u03B3\u03B1 \u03BC\u03B5 \u03A0\u03C1\u03BF\u03B2\u03BF\u03BB\u03AE \u03C4\u03B1\u03B9\u03BD\u03AF\u03B1\u03C2).';
    displayName: '\u03A0\u03B1\u03C1\u03AC\u03C3\u03C4\u03B1\u03C3\u03B7';
    pluralName: 'theater-performances';
    singularName: 'theater-performance';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    available_seats: Attribute.Integer;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::theater-performance.theater-performance',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    datetime: Attribute.DateTime & Attribute.Required;
    hall: Attribute.Relation<
      'api::theater-performance.theater-performance',
      'manyToOne',
      'api::hall.hall'
    >;
    import_source: Attribute.Enumeration<
      ['manual', 'more_sync', 'repeat_expand']
    > &
      Attribute.DefaultTo<'manual'>;
    import_trace: Attribute.Text;
    price: Attribute.Decimal;
    repeat_skip_days: Attribute.Component<'scheduling.skip-day', true>;
    repeat_until: Attribute.Date;
    schedule_kind: Attribute.Enumeration<['exact', 'week_block']> &
      Attribute.Required &
      Attribute.DefaultTo<'exact'>;
    sold_out: Attribute.Boolean & Attribute.DefaultTo<false>;
    theater_show: Attribute.Relation<
      'api::theater-performance.theater-performance',
      'manyToOne',
      'api::theater-show.theater-show'
    > &
      Attribute.Required;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::theater-performance.theater-performance',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    venue: Attribute.Relation<
      'api::theater-performance.theater-performance',
      'manyToOne',
      'api::venue.venue'
    > &
      Attribute.Required;
    week_end: Attribute.Date;
  };
}

export interface ApiTheaterShowTheaterShow extends Schema.CollectionType {
  collectionName: 'theater_shows';
  info: {
    description: '\u03A4\u03BF \u03AD\u03C1\u03B3\u03BF \u2014 \u03CC\u03C7\u03B9 \u03BF \u03C7\u03CE\u03C1\u03BF\u03C2. \u039F\u03B9 \u03B5\u03BC\u03C6\u03B1\u03BD\u03AF\u03C3\u03B5\u03B9\u03C2 \u03B1\u03BD\u03AC \u03C7\u03CE\u03C1\u03BF: \u00AB\u03A0\u03B1\u03C1\u03AC\u03C3\u03C4\u03B1\u03C3\u03B7\u00BB.';
    displayName: '\u0398\u03AD\u03B1\u03C4\u03C1\u03BF';
    pluralName: 'theater-shows';
    singularName: 'theater-show';
  };
  attributes: {
    articles: Attribute.Relation<
      'api::theater-show.theater-show',
      'oneToMany',
      'api::article.article'
    >;
    cast: Attribute.Component<'shared.cast-name', true>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::theater-show.theater-show',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    director: Attribute.String;
    duration: Attribute.Integer;
    editorial_reviews: Attribute.Relation<
      'api::theater-show.theater-show',
      'oneToMany',
      'api::editorial-review.editorial-review'
    >;
    event_group_code: Attribute.String;
    genre: Attribute.Enumeration<
      ['drama', 'comedy', 'musical', 'dance', 'opera']
    >;
    is_last_shows: Attribute.Boolean & Attribute.DefaultTo<false>;
    is_premiere: Attribute.Boolean & Attribute.DefaultTo<false>;
    more_code_links: Attribute.Component<'cinema.more-code-link', true> &
      Attribute.Private;
    more_event_groups: Attribute.Component<'cinema.more-event-group', true>;
    more_event_ids: Attribute.Component<'cinema.more-event-id', true> &
      Attribute.Private;
    more_link: Attribute.String;
    on_tour: Attribute.Boolean & Attribute.DefaultTo<false>;
    poster: Attribute.Media<'images'>;
    rejected_more_codes: Attribute.Component<
      'cinema.rejected-more-code',
      true
    > &
      Attribute.Private;
    reviews: Attribute.Relation<
      'api::theater-show.theater-show',
      'oneToMany',
      'api::user-review.user-review'
    >;
    run_end: Attribute.Date;
    run_start: Attribute.Date;
    slug: Attribute.UID<'api::theater-show.theater-show', 'title'> &
      Attribute.Required;
    sold_out: Attribute.Boolean & Attribute.DefaultTo<false>;
    synopsis: Attribute.Text;
    theater_performances: Attribute.Relation<
      'api::theater-show.theater-show',
      'oneToMany',
      'api::theater-performance.theater-performance'
    >;
    ticket_price: Attribute.Decimal;
    ticket_price_from: Attribute.Decimal;
    ticket_price_to: Attribute.Decimal;
    title: Attribute.String & Attribute.Required;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::theater-show.theater-show',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiUserReviewUserReview extends Schema.CollectionType {
  collectionName: 'user_reviews';
  info: {
    displayName: 'User Review';
    pluralName: 'user-reviews';
    singularName: 'user-review';
  };
  attributes: {
    body: Attribute.Text & Attribute.Required;
    content_type: Attribute.Enumeration<['movie', 'theater', 'restaurant']> &
      Attribute.Required;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::user-review.user-review',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    movie: Attribute.Relation<
      'api::user-review.user-review',
      'manyToOne',
      'api::movie.movie'
    >;
    rating: Attribute.Decimal & Attribute.Required;
    restaurant: Attribute.Relation<
      'api::user-review.user-review',
      'manyToOne',
      'api::restaurant.restaurant'
    >;
    theater_show: Attribute.Relation<
      'api::user-review.user-review',
      'manyToOne',
      'api::theater-show.theater-show'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::user-review.user-review',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    user_email: Attribute.Email;
    user_name: Attribute.String & Attribute.Required;
  };
}

export interface ApiVenueVenue extends Schema.CollectionType {
  collectionName: 'venues';
  info: {
    description: '\u03A3\u03B9\u03BD\u03B5\u03BC\u03AC, \u03B8\u03AD\u03B1\u03C4\u03C1\u03B1 \u03BA\u03B1\u03B9 \u03AC\u03BB\u03BB\u03BF\u03B9 \u03C7\u03CE\u03C1\u03BF\u03B9. \u0395\u03BC\u03C6\u03B1\u03BD\u03AF\u03B6\u03BF\u03BD\u03C4\u03B1\u03B9 \u03C3\u03C4\u03BF Content Manager \u03BA\u03B1\u03B9 \u03C3\u03C4\u03BF \u03BC\u03B5\u03BD\u03BF\u03CD \u00AB\u03A7\u03CE\u03C1\u03BF\u03B9\u00BB.';
    displayName: '\u03A7\u03CE\u03C1\u03BF\u03B9';
    pluralName: 'venues';
    singularName: 'venue';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    address: Attribute.String;
    city: Attribute.Enumeration<['athens', 'thessaloniki', 'other']>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::venue.venue',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    day_prices: Attribute.Component<'cinema.day-price', true>;
    district: Attribute.Enumeration<
      ['center', 'north', 'south', 'west', 'east', 'piraeus', 'greater_other']
    >;
    event_group_code: Attribute.String;
    events: Attribute.Relation<
      'api::venue.venue',
      'oneToMany',
      'api::event.event'
    >;
    google_maps_url: Attribute.String;
    halls: Attribute.Relation<
      'api::venue.venue',
      'oneToMany',
      'api::hall.hall'
    >;
    image: Attribute.Media<'images'>;
    info: Attribute.Text & Attribute.Private;
    more_code_links: Attribute.Component<'cinema.more-code-link', true> &
      Attribute.Private;
    more_event_groups: Attribute.Component<'cinema.more-event-group', true>;
    more_link: Attribute.String;
    more_sync_log: Attribute.Text & Attribute.Private;
    name: Attribute.String & Attribute.Required;
    publishedAt: Attribute.DateTime;
    rejected_more_codes: Attribute.Component<
      'cinema.rejected-more-code',
      true
    > &
      Attribute.Private;
    seats_total: Attribute.Integer;
    showtimes: Attribute.Relation<
      'api::venue.venue',
      'oneToMany',
      'api::showtime.showtime'
    >;
    slug: Attribute.UID<'api::venue.venue', 'name'> & Attribute.Required;
    summer_outdoor: Attribute.Boolean & Attribute.DefaultTo<false>;
    theater_performances: Attribute.Relation<
      'api::venue.venue',
      'oneToMany',
      'api::theater-performance.theater-performance'
    >;
    type: Attribute.Enumeration<['cinema', 'theater', 'other']> &
      Attribute.Required &
      Attribute.DefaultTo<'cinema'>;
    updated: Attribute.Enumeration<['no_new', 'complete', 'needs_manual']> &
      Attribute.Private &
      Attribute.DefaultTo<'no_new'>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::venue.venue',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    venue_id: Attribute.String;
  };
}

export interface PluginContentReleasesRelease extends Schema.CollectionType {
  collectionName: 'strapi_releases';
  info: {
    displayName: 'Release';
    pluralName: 'releases';
    singularName: 'release';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    actions: Attribute.Relation<
      'plugin::content-releases.release',
      'oneToMany',
      'plugin::content-releases.release-action'
    >;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::content-releases.release',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    name: Attribute.String & Attribute.Required;
    releasedAt: Attribute.DateTime;
    scheduledAt: Attribute.DateTime;
    status: Attribute.Enumeration<
      ['ready', 'blocked', 'failed', 'done', 'empty']
    > &
      Attribute.Required;
    timezone: Attribute.String;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::content-releases.release',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction
  extends Schema.CollectionType {
  collectionName: 'strapi_release_actions';
  info: {
    displayName: 'Release Action';
    pluralName: 'release-actions';
    singularName: 'release-action';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentType: Attribute.String & Attribute.Required;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::content-releases.release-action',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    entry: Attribute.Relation<
      'plugin::content-releases.release-action',
      'morphToOne'
    >;
    isEntryValid: Attribute.Boolean;
    locale: Attribute.String;
    release: Attribute.Relation<
      'plugin::content-releases.release-action',
      'manyToOne',
      'plugin::content-releases.release'
    >;
    type: Attribute.Enumeration<['publish', 'unpublish']> & Attribute.Required;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::content-releases.release-action',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginI18NLocale extends Schema.CollectionType {
  collectionName: 'i18n_locale';
  info: {
    collectionName: 'locales';
    description: '';
    displayName: 'Locale';
    pluralName: 'locales';
    singularName: 'locale';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Attribute.String & Attribute.Unique;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::i18n.locale',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    name: Attribute.String &
      Attribute.SetMinMax<
        {
          max: 50;
          min: 1;
        },
        number
      >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::i18n.locale',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUploadFile extends Schema.CollectionType {
  collectionName: 'files';
  info: {
    description: '';
    displayName: 'File';
    pluralName: 'files';
    singularName: 'file';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    alternativeText: Attribute.String;
    caption: Attribute.String;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::upload.file',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    ext: Attribute.String;
    folder: Attribute.Relation<
      'plugin::upload.file',
      'manyToOne',
      'plugin::upload.folder'
    > &
      Attribute.Private;
    folderPath: Attribute.String &
      Attribute.Required &
      Attribute.Private &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    formats: Attribute.JSON;
    hash: Attribute.String & Attribute.Required;
    height: Attribute.Integer;
    mime: Attribute.String & Attribute.Required;
    name: Attribute.String & Attribute.Required;
    previewUrl: Attribute.String;
    provider: Attribute.String & Attribute.Required;
    provider_metadata: Attribute.JSON;
    related: Attribute.Relation<'plugin::upload.file', 'morphToMany'>;
    size: Attribute.Decimal & Attribute.Required;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::upload.file',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    url: Attribute.String & Attribute.Required;
    width: Attribute.Integer;
  };
}

export interface PluginUploadFolder extends Schema.CollectionType {
  collectionName: 'upload_folders';
  info: {
    displayName: 'Folder';
    pluralName: 'folders';
    singularName: 'folder';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    children: Attribute.Relation<
      'plugin::upload.folder',
      'oneToMany',
      'plugin::upload.folder'
    >;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::upload.folder',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    files: Attribute.Relation<
      'plugin::upload.folder',
      'oneToMany',
      'plugin::upload.file'
    >;
    name: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    parent: Attribute.Relation<
      'plugin::upload.folder',
      'manyToOne',
      'plugin::upload.folder'
    >;
    path: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    pathId: Attribute.Integer & Attribute.Required & Attribute.Unique;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::upload.folder',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission
  extends Schema.CollectionType {
  collectionName: 'up_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String & Attribute.Required;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::users-permissions.permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    role: Attribute.Relation<
      'plugin::users-permissions.permission',
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::users-permissions.permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole extends Schema.CollectionType {
  collectionName: 'up_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'role';
    pluralName: 'roles';
    singularName: 'role';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    description: Attribute.String;
    name: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    permissions: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToMany',
      'plugin::users-permissions.permission'
    >;
    type: Attribute.String & Attribute.Unique;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    users: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToMany',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginUsersPermissionsUser extends Schema.CollectionType {
  collectionName: 'up_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'user';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
    timestamps: true;
  };
  attributes: {
    blocked: Attribute.Boolean & Attribute.DefaultTo<false>;
    confirmationToken: Attribute.String & Attribute.Private;
    confirmed: Attribute.Boolean & Attribute.DefaultTo<false>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    email: Attribute.Email &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    password: Attribute.Password &
      Attribute.Private &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    provider: Attribute.String;
    resetPasswordToken: Attribute.String & Attribute.Private;
    role: Attribute.Relation<
      'plugin::users-permissions.user',
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    username: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface ContentTypes {
      'admin::api-token': AdminApiToken;
      'admin::api-token-permission': AdminApiTokenPermission;
      'admin::permission': AdminPermission;
      'admin::role': AdminRole;
      'admin::transfer-token': AdminTransferToken;
      'admin::transfer-token-permission': AdminTransferTokenPermission;
      'admin::user': AdminUser;
      'api::article.article': ApiArticleArticle;
      'api::cuisine.cuisine': ApiCuisineCuisine;
      'api::editorial-review.editorial-review': ApiEditorialReviewEditorialReview;
      'api::event.event': ApiEventEvent;
      'api::hall.hall': ApiHallHall;
      'api::homepage.homepage': ApiHomepageHomepage;
      'api::movie-genre.movie-genre': ApiMovieGenreMovieGenre;
      'api::movie.movie': ApiMovieMovie;
      'api::restaurant-category.restaurant-category': ApiRestaurantCategoryRestaurantCategory;
      'api::restaurant.restaurant': ApiRestaurantRestaurant;
      'api::showtime.showtime': ApiShowtimeShowtime;
      'api::site-navigation.site-navigation': ApiSiteNavigationSiteNavigation;
      'api::theater-performance.theater-performance': ApiTheaterPerformanceTheaterPerformance;
      'api::theater-show.theater-show': ApiTheaterShowTheaterShow;
      'api::user-review.user-review': ApiUserReviewUserReview;
      'api::venue.venue': ApiVenueVenue;
      'plugin::content-releases.release': PluginContentReleasesRelease;
      'plugin::content-releases.release-action': PluginContentReleasesReleaseAction;
      'plugin::i18n.locale': PluginI18NLocale;
      'plugin::upload.file': PluginUploadFile;
      'plugin::upload.folder': PluginUploadFolder;
      'plugin::users-permissions.permission': PluginUsersPermissionsPermission;
      'plugin::users-permissions.role': PluginUsersPermissionsRole;
      'plugin::users-permissions.user': PluginUsersPermissionsUser;
    }
  }
}
