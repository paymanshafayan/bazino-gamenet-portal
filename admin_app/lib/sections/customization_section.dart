
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/l10n.dart';
import '../widgets/common.dart';

/// شخصی‌سازی: تنظیمات سایت (کلید/مقدار) + تصاویر قالب (اسلات‌ها)
class CustomizationSection extends StatelessWidget {
  const CustomizationSection({super.key});

  static const _imageSlots = ['hero_main', 'hero_tournament', 'hero_live'];

  Future<Map<String, dynamic>> _load() async {
    final res = await ApiClient.get('/api/settings');
    if (res is Map) return Map<String, dynamic>.from(res);
    return <String, dynamic>{};
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<AppLang>();
    return FutureView<Map<String, dynamic>>(
      loader: _load,
      builder: (context, settings) {
        final entries = settings.entries.where((e) => e.key != 'success').toList()
          ..sort((a, b) => a.key.compareTo(b.key));
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Panel(
              title: lang.t('themeImages'),
              child: Column(
                children: [
                  for (final slot in _imageSlots)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 5),
                      child: Row(
                        children: [
                          Icon(Icons.image_outlined, size: 16, color: const Color(0xFF22D3EE)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(slot,
                                style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Colors.white70)),
                          ),
                          OpChip(
                            label: lang.t('uploadImage'),
                            icon: Icons.upload_outlined,
                            onTap: () => _uploadImage(context, slot),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            Panel(
              title: lang.t('siteSettings'),
              child: Column(
                children: [
                  for (final e in entries)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 130,
                            child: Text(e.key,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                    fontSize: 11.5, fontWeight: FontWeight.w800, color: Colors.grey.shade400)),
                          ),
                          Expanded(
                            child: Text(
                              '${e.value ?? ''}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white70),
                            ),
                          ),
                          const SizedBox(width: 8),
                          InkWell(
                            onTap: () => _edit(context, e.key, '${e.value ?? ''}'),
                            child: Icon(Icons.edit_outlined, size: 16, color: const Color(0xFFFFB800)),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Future<void> _edit(BuildContext context, String key, String current) async {
    final lang = context.read<AppLang>();
    final ctrl = TextEditingController(text: current);
    final saved = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: const Color(0xFF151C2E),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 20, right: 20, top: 20,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(key, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
            const SizedBox(height: 14),
            TextField(controller: ctrl, maxLines: 3, decoration: InputDecoration(labelText: lang.t('settingValue'))),
            const SizedBox(height: 14),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: Text(lang.t('save')),
            ),
          ],
        ),
      ),
    );
    final value = ctrl.text;
    ctrl.dispose();
    if (saved != true) return;
    try {
      await ApiClient.post('/api/admin/settings', body: {'key': key, 'value': value});
      if (context.mounted) {
        toast(context, lang.t('saved'));
        (context as Element).markNeedsBuild();
      }
    } on ApiError catch (e) {
      if (context.mounted) toast(context, e.message, error: true);
    }
  }

  Future<void> _uploadImage(BuildContext context, String slot) async {
    final lang = context.read<AppLang>();
    final picked = await FilePicker.platform.pickFiles(
      type: FileType.image,
      withData: true,
    );
    final file = picked?.files.single;
    if (file == null || file.bytes == null) return;
    try {
      final mime = file.extension?.toLowerCase() == 'png' ? 'image/png' : 'image/jpeg';
      await ApiClient.postRaw(
        '/api/admin/theme-image',
        file.bytes!,
        mime,
        query: {'slot': slot},
      );
      if (context.mounted) {
        toast(context, lang.t('imageUploaded'));
        (context as Element).markNeedsBuild();
      }
    } on ApiError catch (e) {
      if (context.mounted) toast(context, e.message, error: true);
    }
  }
}
