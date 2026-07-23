<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DarkShield Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-gray-100 min-h-screen p-6">
  <div class="max-w-5xl mx-auto">

    <h1 class="text-3xl font-bold mb-6">🛡️ DarkShield Dashboard</h1>

    <!-- Stats -->
    <div class="grid grid-cols-3 gap-4 mb-8">
      <div class="bg-gray-800 rounded-lg p-4">
        <p class="text-gray-400 text-sm">Total scans</p>
        <p class="text-3xl font-bold">{{ $stats['total'] }}</p>
      </div>
      <div class="bg-red-900/40 rounded-lg p-4">
        <p class="text-red-300 text-sm">Dark patterns</p>
        <p class="text-3xl font-bold text-red-400">{{ $stats['dark'] }}</p>
      </div>
      <div class="bg-green-900/40 rounded-lg p-4">
        <p class="text-green-300 text-sm">Clean pages</p>
        <p class="text-3xl font-bold text-green-400">{{ $stats['clean'] }}</p>
      </div>
    </div>

    <!-- Table -->
    <h2 class="text-xl font-semibold mb-4">Recent scans</h2>
    <div class="bg-gray-800 rounded-lg overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="bg-gray-700 text-left text-sm">
            <th class="p-3">URL</th>
            <th class="p-3">Date</th>
            <th class="p-3">Pattern</th>
            <th class="p-3">Regex score</th>
            <th class="p-3">Verdict</th>
          </tr>
        </thead>
        <tbody>
          @forelse ($scans as $scan)
          <tr class="border-t border-gray-700 text-sm">
            <td class="p-3 max-w-xs truncate text-gray-300">{{ $scan->url }}</td>
            <td class="p-3 text-gray-400 whitespace-nowrap">{{ $scan->created_at->format('Y-m-d H:i') }}</td>
            <td class="p-3 text-gray-300">
              {{ $scan->llm_classification['pattern_detected'] ?? '—' }}
            </td>
            <td class="p-3 text-gray-300">
              {{ $scan->regex_score !== null ? round($scan->regex_score * 100) . '%' : '—' }}
            </td>
            <td class="p-3">
              @if ($scan->is_dark_pattern === true)
                <span class="bg-red-600 px-2 py-1 rounded text-xs">⚠ Dark</span>
              @elseif ($scan->is_dark_pattern === false)
                <span class="bg-green-600 px-2 py-1 rounded text-xs">✓ Clean</span>
              @else
                <span class="bg-gray-600 px-2 py-1 rounded text-xs">? Unknown</span>
              @endif
            </td>
          </tr>
          @empty
          <tr>
            <td colspan="5" class="p-6 text-center text-gray-500">No scans yet.</td>
          </tr>
          @endforelse
        </tbody>
      </table>
    </div>

  </div>
</body>
</html>
