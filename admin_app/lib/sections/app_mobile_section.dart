
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/format.dart';
import '../core/l10n.dart';
import '../widgets/common.dart';
import '../widgets/crud.dart';

/// اسلایدر اپ موبایل: CRUD اسلایدها
class AppSliderSection extends StatelessWidget {
  const AppSliderSection({super.key});

  @override
  Widget build(BuildContext context) {
    return CrudScreen(
      config: CrudConfig(
        load: () async => _list(),
        create: (v) => ApiClient.post('/api/admin/app-sliders', body: v),
        update: (id, v) => ApiClient.put('/api/admin/app-sliders/$id', body: v),
        remove: (id) => ApiClient.delete('/api/admin/app-sliders/$id'),
        fields: const [
          FieldSpec('titleFa', 'title', required: true),
          FieldSpec('titleEn', 'title (EN)'),
          FieldSpec('subtitleFa', 'subtitle'),
          FieldSpec('subtitleEn', 'subtitle (EN)'),
          FieldSpec('imageUrl', 'imageUrl', required: true),
          FieldSpec('mobileImageUrl', 'mobileImageUrl'),
          FieldSpec('target', 'target', type: FieldType.dropdown,
              options: ['home', 'reserve', 'tournaments', 'shop', 'cafe', 'blog']),
        ],
        titleOf: (lang, item) => '${item['titleFa'] ?? item['title'] ?? item['id']}',
        subtitleOf: (lang, item) => '${item['target'] ?? ''} · ${item['imageUrl'] ?? ''}',
      ),
    );
  }
}

Future<List<Map<String, dynamic>>> _list() async {
  final res = await ApiClient.get('/api/app-sliders');
  if (res is List) return res.whereType<Map<String, dynamic>>().toList();
  return [];
}

/// اپ موبایل: وضعیت Appetize + توکن + آپلود APK + لینک‌های دانلود
class MobileAppSection extends StatefulWidget {
  const MobileAppSection({super.key});

  @override
  State<MobileAppSection> createState() => _MobileAppSectionState();
}

class _MobileAppSectionState extends State<MobileAppSection> {
  Future<Map<String, dynamic>> _load() async {
    final results = await Future.wait<Object?>([
      ApiClient.get('/api/admin/appetize/status'),
      ApiClient.get('/api/mobile-app'),
    ]);
    return {
      'status': results[0] is Map ? results[0] as Map<String, dynamic> : <String, dynamic>{},
      'app': results[1] is Map ? results[1] as Map<String, dynamic> : <String, dynamic>{},
    };
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async => (context as Element).markNeedsBuild(),
      child: FutureView<Map<String, dynamic>>(
        loader: _load,
        builder: (context, data) {
          final lang = context.read<AppLang>();
          final status = data['status'] as Map<String, dynamic>;
          final app = data['app'] as Map<String, dynamic>;
          final apkAvailable = (status['apkAvailable'] ?? app['apkAvailable']) == true;
          final storeLinks = _links(app['storeLinks']);

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Panel(
                title: lang.t('appetizeStatus'),
                child: Column(
                  children: [
                    KeyValue(label: lang.t('configured'),
                        value: status['configured'] == true ? lang.t('yes') : lang.t('no')),
                    if (status['tokenHint'] != null && status['tokenHint'].toString().isNotEmpty)
                      KeyValue(label: lang.t('appetizeToken'), value: '${status['tokenHint']}'),
                    if (status['app'] is Map && status['app']['publicKey'] != null)
                      KeyValue(label: 'publicKey', value: '${status['app']['publicKey']}'),
                    KeyValue(label: lang.t('apkFile'),
                        value: apkAvailable ? '${app['apkFileName'] ?? ''} · ${fmtBytes(app['apkSize'])}' : lang.t('apkUnavailable')),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(child: OpChip(
                          label: lang.t('pushToAppetize'),
                          icon: Icons.play_circle_outline,
                          onTap: () => _push(context),
                        )),
                        const SizedBox(width: 8),
                        Expanded(child: OpChip(
                          label: lang.t('apkUpload'),
                          icon: Icons.upload_file_outlined,
                          accent: const Color(0xFF22D3EE),
                          onTap: () => _uploadApk(context),
                        )),
                      ],
                    ),
                  ],
                ),
              ),
              _TokenPanel(status: status),
              Panel(
                title: lang.t('storeLinks'),
                child: _StoreLinksEditor(links: storeLinks),
              ),
            ],
          );
        },
      ),
    );
  }

  List<Map<String, dynamic>> _links(dynamic raw) {
    if (raw is List) return raw.whereType<Map<String, dynamic>>().toList();
    return [];
  }

  Future<void> _push(BuildContext context) async {
    final lang = context.read<AppLang>();
    try {
      await ApiClient.post('/api/admin/appetize/push', body: {'source': 'site-apk'});
      if (context.mounted) {
        toast(context, lang.t('pushed'));
        (context as Element).markNeedsBuild();
      }
    } on ApiError catch (e) {
      if (context.mounted) toast(context, e.message, error: true);
    }
  }

  Future<void> _uploadApk(BuildContext context) async {
    final lang = context.read<AppLang>();
    final picked = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['apk'],
      withData: true,
    );
    final file = picked?.files.single;
    if (file == null || file.bytes == null) return;
    try {
      await ApiClient.postRaw(
        '/api/admin/mobile-app/upload-apk',
        file.bytes!,
        'application/octet-stream',
        query: {'fileName': file.name},
      );
      if (context.mounted) {
        toast(context, lang.t('apkUploaded'));
        (context as Element).markNeedsBuild();
      }
    } on ApiError catch (e) {
      if (context.mounted) toast(context, e.message, error: true);
    }
  }
}

class _TokenPanel extends StatelessWidget {
  const _TokenPanel({required this.status});
  final Map<String, dynamic> status;

  @override
  Widget build(BuildContext context) {
    final lang = context.read<AppLang>();
    final ctrl = TextEditingController();
    return Panel(
      title: lang.t('appetizeToken'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: ctrl,
            decoration: InputDecoration(labelText: 'API token', prefixIcon: const Icon(Icons.key_outlined)),
            style: const TextStyle(fontSize: 13),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: () async {
                    final t = ctrl.text.trim();
                    if (t.length < 8) return;
                    try {
                      await ApiClient.put('/api/admin/appetize/token', body: {'token': t});
                      if (context.mounted) {
                        toast(context, lang.t('saved'));
                        (context as Element).markNeedsBuild();
                      }
                    } on ApiError catch (e) {
                      if (context.mounted) toast(context, e.message, error: true);
                    }
                  },
                  child: Text(lang.t('saveToken')),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton(
                  onPressed: status['configured'] == true
                      ? () async {
                          try {
                            await ApiClient.delete('/api/admin/appetize/token');
                            if (context.mounted) {
                              toast(context, lang.t('deleted'));
                              (context as Element).markNeedsBuild();
                            }
                          } on ApiError catch (e) {
                            if (context.mounted) toast(context, e.message, error: true);
                          }
                        }
                      : null,
                  child: Text(lang.t('removeToken')),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StoreLinksEditor extends StatefulWidget {
  const _StoreLinksEditor({required this.links});
  final List<Map<String, dynamic>> links;

  @override
  State<_StoreLinksEditor> createState() => _StoreLinksEditorState();
}

class _StoreLinksEditorState extends State<_StoreLinksEditor> {
  late final List<Map<String, dynamic>> _links;

  @override
  void initState() {
    super.initState();
    _links = widget.links.map((l) => Map<String, dynamic>.from(l)).toList();
  }

  Future<void> _save() async {
    final lang = context.read<AppLang>();
    try {
      await ApiClient.post('/api/admin/mobile-app/store-links', body: {'links': _links});
      if (mounted) toast(context, lang.t('saved'));
    } on ApiError catch (e) {
      if (mounted) toast(context, e.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.read<AppLang>();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final l in _links)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    children: [
                      TextField(
                        controller: TextEditingController(text: '${l['labelFa'] ?? ''}'),
                        decoration: InputDecoration(labelText: lang.t('linkLabel'), isDense: true),
                        style: const TextStyle(fontSize: 12.5),
                        onChanged: (v) => l['labelFa'] = v,
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: TextEditingController(text: '${l['url'] ?? ''}'),
                        decoration: InputDecoration(labelText: lang.t('linkUrl'), isDense: true),
                        style: const TextStyle(fontSize: 12.5),
                        onChanged: (v) => l['url'] = v,
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.delete_outline, color: Colors.red.shade300, size: 20),
                  onPressed: () => setState(() => _links.remove(l)),
                ),
              ],
            ),
          ),
        const SizedBox(height: 6),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => setState(() => _links.add({
                  'kind': 'other',
                  'labelFa': lang.t('addLink'),
                  'labelEn': 'Download',
                  'url': 'https://',
                  'isActive': true,
                })),
                icon: const Icon(Icons.add, size: 16),
                label: Text(lang.t('addLink'), style: const TextStyle(fontSize: 12)),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: FilledButton.icon(
                onPressed: _save,
                icon: const Icon(Icons.save_outlined, size: 16),
                label: Text(lang.t('save'), style: const TextStyle(fontSize: 12)),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
