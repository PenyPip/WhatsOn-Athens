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
    description: '\u03A3\u03B5\u03B9\u03C1\u03AC \u03BC\u03C0\u03BB\u03BF\u03BA \u03C3\u03C4\u03B7\u03BD \u03B1\u03C1\u03C7\u03B9\u03BA\u03AE \u03BA\u03B1\u03B9 \u03C0\u03C1\u03BF\u03C4\u03B5\u03B9\u03BD\u03CC\u03BC\u03B5\u03BD\u03BF hero (\u03C4\u03B1\u03B9\u03BD\u03AF\u03B1/\u03C0\u03B1\u03C1\u03AC\u03C3\u03C4\u03B1\u03C3\u03B7).';
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
    featured_movie_list_index: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<2>;
    layout_sections: Attribute.Component<'home.layout-section', true>;
    priority_movie: Attribute.Relation<
      'api::homepage.homepage',
      'manyToOne',
      'api::movie.movie'
    >;
    priority_theater_show: Attribute.Relation<
      'api::homepage.homepage',
      'manyToOne',
      'api::theater-show.theater-show'
    >;
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
      'oneToMany',
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
    description: '\u0394\u03B7\u03BC\u03B9\u03BF\u03CD\u03C1\u03B3\u03B7\u03C3\u03B5 \u03C0\u03C1\u03CE\u03C4\u03B1 \u03C4\u03B7\u03BD \u03C4\u03B1\u03B9\u03BD\u03AF\u03B1. \u039F\u03B9 \u03BC\u03AD\u03C1\u03B5\u03C2 \u03BA\u03B1\u03B9 \u03BF\u03B9 \u03CE\u03C1\u03B5\u03C2 \u03B1\u03BD\u03AC \u03C3\u03B9\u03BD\u03B5\u03BC\u03AC \u03C0\u03C1\u03BF\u03C3\u03C4\u03AF\u03B8\u03B5\u03BD\u03C4\u03B1\u03B9 \u03BC\u03B5 \u03B5\u03B3\u03B3\u03C1\u03B1\u03C6\u03AD\u03C2 \u00AB\u03A0\u03C1\u03BF\u03B2\u03BF\u03BB\u03AE \u03C4\u03B1\u03B9\u03BD\u03AF\u03B1\u03C2\u00BB: \u03BA\u03AC\u03B8\u03B5 \u03BC\u03AF\u03B1 = \u03AD\u03BD\u03B1 Venue + \u03B7\u03BC\u03B5\u03C1\u03BF\u03BC\u03B7\u03BD\u03AF\u03B1/\u03CE\u03C1\u03B1.';
    displayName: '\u03A4\u03B1\u03B9\u03BD\u03AF\u03B1';
    pluralName: 'movies';
    singularName: 'movie';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    age_rating: Attribute.String;
    cast: Attribute.JSON;
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
    is_new: Attribute.Boolean & Attribute.DefaultTo<false>;
    language: Attribute.String;
    movie_genre: Attribute.Relation<
      'api::movie.movie',
      'manyToOne',
      'api::movie-genre.movie-genre'
    >;
    poster: Attribute.Media<'images'>;
    publishedAt: Attribute.DateTime;
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
    slug: Attribute.UID<'api::movie.movie', 'title'> & Attribute.Required;
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

export interface ApiRestaurantRestaurant extends Schema.CollectionType {
  collectionName: 'restaurants';
  info: {
    displayName: 'Restaurant';
    pluralName: 'restaurants';
    singularName: 'restaurant';
  };
  attributes: {
    address: Attribute.String;
    city: Attribute.Enumeration<['athens', 'thessaloniki', 'other']>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::restaurant.restaurant',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    cuisine: Attribute.String;
    editorial_reviews: Attribute.Relation<
      'api::restaurant.restaurant',
      'oneToMany',
      'api::editorial-review.editorial-review'
    >;
    editorial_score: Attribute.Decimal;
    gradient_from: Attribute.String;
    gradient_to: Attribute.String;
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
    description: '\u039C\u03AF\u03B1 \u03C0\u03C1\u03BF\u03B2\u03BF\u03BB\u03AE = \u03AD\u03BD\u03B1 \u03C3\u03B9\u03BD\u03B5\u03BC\u03AC (Venue) + \u03B7\u03BC\u03B5\u03C1\u03BF\u03BC\u03B7\u03BD\u03AF\u03B1 \u03BA\u03B1\u03B9 \u03CE\u03C1\u03B1. \u0393\u03B9\u03B1 \u03AC\u03BB\u03BB\u03B7 \u03BC\u03AD\u03C1\u03B1 \u03AE \u03AC\u03BB\u03BB\u03BF \u03C3\u03B9\u03BD\u03B5\u03BC\u03AC, \u03C0\u03C1\u03CC\u03C3\u03B8\u03B5\u03C3\u03B5 \u03BD\u03AD\u03B1 \u03B5\u03B3\u03B3\u03C1\u03B1\u03C6\u03AE \u03AE \u03BC\u03AD\u03C3\u03B1 \u03B1\u03C0\u03CC \u03C4\u03B7\u03BD \u03C4\u03B1\u03B9\u03BD\u03AF\u03B1 \u2192 \u03A0\u03C1\u03BF\u03B2\u03BF\u03BB\u03AD\u03C2.';
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
    movie: Attribute.Relation<
      'api::showtime.showtime',
      'manyToOne',
      'api::movie.movie'
    >;
    price: Attribute.Decimal;
    summer_screening: Attribute.Boolean & Attribute.DefaultTo<false>;
    theater_show: Attribute.Relation<
      'api::showtime.showtime',
      'manyToOne',
      'api::theater-show.theater-show'
    >;
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
  };
}

export interface ApiTheaterShowTheaterShow extends Schema.CollectionType {
  collectionName: 'theater_shows';
  info: {
    displayName: 'Theater Show';
    pluralName: 'theater-shows';
    singularName: 'theater-show';
  };
  attributes: {
    cast: Attribute.JSON;
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
    genre: Attribute.Enumeration<
      ['drama', 'comedy', 'musical', 'dance', 'opera']
    >;
    gradient_from: Attribute.String;
    gradient_to: Attribute.String;
    is_last_shows: Attribute.Boolean & Attribute.DefaultTo<false>;
    is_premiere: Attribute.Boolean & Attribute.DefaultTo<false>;
    poster: Attribute.Media<'images'>;
    reviews: Attribute.Relation<
      'api::theater-show.theater-show',
      'oneToMany',
      'api::user-review.user-review'
    >;
    showtimes: Attribute.Relation<
      'api::theater-show.theater-show',
      'oneToMany',
      'api::showtime.showtime'
    >;
    slug: Attribute.UID<'api::theater-show.theater-show', 'title'> &
      Attribute.Required;
    synopsis: Attribute.Text;
    tags: Attribute.JSON;
    title: Attribute.String & Attribute.Required;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::theater-show.theater-show',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    venue: Attribute.Relation<
      'api::theater-show.theater-show',
      'manyToOne',
      'api::venue.venue'
    >;
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
    description: '\u03A0.\u03C7. Village The Mall, \u03B8\u03B5\u03C1\u03B9\u03BD\u03CC \u0391\u03B8\u03AE\u03BD\u03B1 \u03BA.\u03BB\u03C0. \u03A4\u03CD\u03C0\u03BF\u03C2: \u03A3\u03B9\u03BD\u03B5\u03BC\u03AC / \u0398\u03AD\u03B1\u03C4\u03C1\u03BF \u03BA.\u03BB\u03C0. \u03A4\u03BF \u00AB\u0398\u03B5\u03C1\u03B9\u03BD\u03CC (\u03B1\u03BD\u03BF\u03B9\u03C7\u03C4\u03CC \u03C3\u03B9\u03BD\u03B5\u03BC\u03AC)\u00BB \u03BE\u03B5\u03C7\u03C9\u03C1\u03AF\u03B6\u03B5\u03B9 \u03C4\u03B1 \u03B8\u03B5\u03C1\u03B9\u03BD\u03AC \u03B1\u03C0\u03CC \u03C4\u03B1 \u03BA\u03BB\u03B5\u03B9\u03C3\u03C4\u03AC.';
    displayName: '\u03A7\u03CE\u03C1\u03BF\u03C2 / \u03A3\u03B9\u03BD\u03B5\u03BC\u03AC';
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
    google_maps_url: Attribute.String;
    halls: Attribute.Relation<
      'api::venue.venue',
      'oneToMany',
      'api::hall.hall'
    >;
    image: Attribute.Media<'images'>;
    more_link: Attribute.String;
    name: Attribute.String & Attribute.Required;
    publishedAt: Attribute.DateTime;
    seats_total: Attribute.Integer;
    showtimes: Attribute.Relation<
      'api::venue.venue',
      'oneToMany',
      'api::showtime.showtime'
    >;
    slug: Attribute.UID<'api::venue.venue', 'name'> & Attribute.Required;
    summer_outdoor: Attribute.Boolean & Attribute.DefaultTo<false>;
    theater_shows: Attribute.Relation<
      'api::venue.venue',
      'oneToMany',
      'api::theater-show.theater-show'
    >;
    type: Attribute.String;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::venue.venue',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
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
      'api::editorial-review.editorial-review': ApiEditorialReviewEditorialReview;
      'api::hall.hall': ApiHallHall;
      'api::homepage.homepage': ApiHomepageHomepage;
      'api::movie-genre.movie-genre': ApiMovieGenreMovieGenre;
      'api::movie.movie': ApiMovieMovie;
      'api::restaurant.restaurant': ApiRestaurantRestaurant;
      'api::showtime.showtime': ApiShowtimeShowtime;
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
