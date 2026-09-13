import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/l10n.dart';
import 'common.dart';

enum FieldType { text, multiline, number, dropdown, toggle }

/// تعریف یک فیلد فرم CRUD
class FieldSpec {
  const FieldSpec(
    this.key,
    this.labelKey, {
    this.type = FieldType.text,
    this.options = const [],
    this.required = false,
    this.hint,
    this.minLines,
  });

  final String key;
  final String labelKey;
  final FieldType type;
  final List<String> options; // برای dropdown (مقدار خام)
  final bool required;
  final String? hint;
  final int? minLines;
}

/// پیکربندی یک بخش CRUD (لیست + افزودن/ویرایش/حذف)
class CrudConfig {
  const CrudConfig({
    required this.load,
    required this.create,
    required this.update,
    required this.remove,
    required this.fields,
    required this.titleOf,
    this.subtitleOf,
    this.trailingOf,
    this.initialOf,
    thisFabLabelKey,
  });

  /// GET → List<Map> (کل رکوردها)
  final Future<List<Map<String, dynamic>>> Function() load;
  /// POST با مقادیر فرم
  final Future<void> Function(Map<String, dynamic>) create;
  /// PUT با id + مقادیر فرم
  final Future<void> Function(String id, Map<String, dynamic>) update;
  /// DELETE
  final Future<void> Function(String id) remove;
  final List<FieldSpec> fields;

  final String Function(AppLang lang, Map<String, dynamic> item) titleOf;
  final String Function(AppLang lang, Map<String, dynamic> item)? subtitleOf;
  final Widget Function(BuildContext, Map<String, dynamic> item)? trailingOf;
  /// مقدار اولیهٔ فرم ویرایش (پیش‌فرض: مقادیر موجود item برای فیلدها)
  final Map<String, dynamic> Function(Map<String, dynamic> item)? initialOf;
}

/// صفحهٔ CRUD کامل — لیست + FAB + فرم bottom-sheet
class CrudScreen extends StatefulWidget {
  const CrudScreen({super.key, required this.config, this.header});
  final CrudConfig config;
  final Widget? header;

  @override
  State<CrudScreen> createState() => _CrudScreenState();
}

class _CrudScreenState extends State<CrudScreen> {
  int _attempt = 0;
  bool _busy = false;

  Future<void> _refresh() async {
    setState(() => _attempt++);
  }

  Future<void> _openForm([Map<String, dynamic>? item]) async {
    final lang = context.read<AppLang>();
    final cfg = widget.config;
    final values = <String, dynamic>{};
    if (item != null) {
      final initial = cfg.initialOf?.call(item) ?? item;
      for (final f in cfg.fields) {
        values[f.key] = initial[f.key];
      }
      // id برای _EntityForm (به‌روزرسانی/حذف با شناسهٔ موجود)
      values['id'] = item['id'];
    }
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF151C2E),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: _EntityForm(config: cfg, values: values, isEdit: item != null),
      ),
    );
    if (saved == true) {
      toast(context, lang.t('saved'));
      await _refresh();
    }
  }

  Future<void> _delete(Map<String, dynamic> item) async {
    final lang = context.read<AppLang>();
    final ok = await showConfirm(
      context,
      title: lang.t('delete'),
      body: lang.t('deleteConfirmBody'),
      confirmLabel: lang.t('delete'),
      danger: true,
    );
    if (!ok) return;
    setState(() => _busy = true);
    try {
      await widget.config.remove(item['id']?.toString() ?? '');
      if (!mounted) return;
      toast(context, lang.t('deleted'));
      await _refresh();
    } on ApiError catch (e) {
      if (!mounted) return;
      toast(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.read<AppLang>();
    final cfg = widget.config;
    return Stack(
      children: [
        FutureView<List<Map<String, dynamic>>>(
          key: ValueKey(_attempt),
          loader: cfg.load,
          isEmpty: (list) => list.isEmpty,
          builder: (context, list) {
            return ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 90),
              itemCount: list.length,
              itemBuilder: (context, i) {
                final item = list[i];
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF111726),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              cfg.titleOf(lang, item),
                              style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: Colors.white),
                            ),
                            if (cfg.subtitleOf != null) ...[
                              const SizedBox(height: 3),
                              Text(
                                cfg.subtitleOf!(lang, item),
                                style: TextStyle(fontSize: 11.5, color: Colors.grey.shade500, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ],
                        ),
                      ),
                      if (cfg.trailingOf != null) cfg.trailingOf!(context, item),
                      const SizedBox(width: 8),
                      InkWell(
                        onTap: _busy ? null : () => _openForm(item),
                        child: Icon(Icons.edit_outlined, size: 18, color: Colors.grey.shade400),
                      ),
                      const SizedBox(width: 12),
                      InkWell(
                        onTap: _busy ? null : () => _delete(item),
                        child: Icon(Icons.delete_outline, size: 18, color: Colors.red.shade300),
                      ),
                    ],
                  ),
                );
              },
            );
          },
        ),
        // FAB افزودن
        Positioned(
          left: 24,
          right: 24,
          bottom: 20,
          child: FilledButton.icon(
            onPressed: _busy ? null : () => _openForm(null),
            icon: const Icon(Icons.add, size: 20),
            label: Text(lang.t('add'), style: const TextStyle(fontSize: 13)),
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
          ),
        ),
      ],
    );
  }
}

/* ── فرم موجودیت (افزودن/ویرایش) ── */
class _EntityForm extends StatefulWidget {
  const _EntityForm({required this.config, required this.values, required this.isEdit});

  final CrudConfig config;
  final Map<String, dynamic> values;
  final bool isEdit;

  @override
  State<_EntityForm> createState() => _EntityFormState();
}

class _EntityFormState extends State<_EntityForm> {
  late final Map<String, TextEditingController> _controllers;
  late final Map<String, bool> _toggles;
  late final Map<String, String?> _dropdowns;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _controllers = {
      for (final f in widget.config.fields)
        f.key: TextEditingController(text: widget.values[f.key]?.toString() ?? '')
    };
    _toggles = {
      for (final f in widget.config.fields)
        if (f.type == FieldType.toggle) f.key: (widget.values[f.key] == true || widget.values[f.key] == 1 || widget.values[f.key] == '1')
    };
    _dropdowns = {
      for (final f in widget.config.fields)
        if (f.type == FieldType.dropdown)
          f.key: widget.values[f.key]?.toString() ?? (f.options.isNotEmpty ? f.options.first : null)
    };
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    final lang = context.read<AppLang>();
    final cfg = widget.config;
    final out = <String, dynamic>{};
    for (final f in cfg.fields) {
      switch (f.type) {
        case FieldType.number:
          final raw = _controllers[f.key]!.text.trim();
          if (f.required && raw.isEmpty) {
            setState(() => _error = '${lang.t(f.labelKey)}: ${lang.t('requiredField')}');
            return;
          }
          out[f.key] = num.tryParse(raw) ?? 0;
          break;
        case FieldType.dropdown:
          out[f.key] = _dropdowns[f.key] ?? '';
          break;
        case FieldType.toggle:
          out[f.key] = _toggles[f.key] ?? false;
          break;
        default:
          final v = _controllers[f.key]!.text.trim();
          if (f.required && v.isEmpty) {
            setState(() => _error = '${lang.t(f.labelKey)}: ${lang.t('requiredField')}');
            return;
          }
          out[f.key] = v;
      }
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      if (widget.isEdit) {
        await cfg.update(widget.values['id']?.toString() ?? '', out);
      } else {
        await cfg.create(out);
      }
      if (mounted) Navigator.pop(context, true);
    } on ApiError catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.read<AppLang>();
    final cfg = widget.config;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(width: 44, height: 4, alignment: Alignment.center, margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(4))),
          Text(
            widget.isEdit ? lang.t('edit') : lang.t('add'),
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 18),
          for (final f in cfg.fields) ...[
            if (f.type == FieldType.dropdown)
              DropdownButtonFormField<String>(
                value: _dropdowns[f.key],
                decoration: InputDecoration(labelText: lang.t(f.labelKey)),
                items: [
                  for (final o in f.options)
                    DropdownMenuItem(value: o, child: Text(o, style: const TextStyle(fontSize: 13))),
                ],
                onChanged: (v) => setState(() => _dropdowns[f.key] = v),
              )
            else if (f.type == FieldType.toggle)
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(lang.t(f.labelKey), style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700)),
                value: _toggles[f.key] ?? false,
                onChanged: (v) => setState(() => _toggles[f.key] = v),
              )
            else
              TextField(
                controller: _controllers[f.key],
                keyboardType: f.type == FieldType.number ? TextInputType.number : TextInputType.text,
                minLines: f.type == FieldType.multiline ? (f.minLines ?? 3) : 1,
                maxLines: f.type == FieldType.multiline ? 8 : 1,
                decoration: InputDecoration(labelText: lang.t(f.labelKey), hintText: f.hint),
                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600),
              ),
            const SizedBox(height: 12),
          ],
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(_error!, style: TextStyle(color: Colors.red.shade300, fontSize: 12.5, fontWeight: FontWeight.w700)),
            ),
          const SizedBox(height: 6),
          FilledButton(
            onPressed: _saving ? null : _save,
            style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
            child: _saving
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : Text(lang.t('save')),
          ),
        ],
      ),
    );
  }
}
