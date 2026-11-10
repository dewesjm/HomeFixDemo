/* The error thrown when Routing Settings can't produce a routing (a missing, inactive or ambiguous
   definition); signoff blocks on it and shows its message. */
export class RoutingConfigurationError extends Error {}
