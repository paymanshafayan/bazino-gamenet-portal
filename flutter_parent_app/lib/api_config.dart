const String _kApiBaseUrlConfigured = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://bazino.pro/',
);

final String kApiBaseUrl = _kApiBaseUrlConfigured.replaceFirst(RegExp(r'/+$'), '');

String get kParentApiBase => '$kApiBaseUrl/api/parent';
