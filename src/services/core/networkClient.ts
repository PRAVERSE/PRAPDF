/**
 * PRA PDF — Unified Network Client with Real Upload & Download Progress
 * A PRAVERSE Company
 *
 * Provides measurable upload and download progress events via XMLHttpRequest.
 * Truthfully reports stages without fake timers.
 */

export interface NetworkProgressCallback {
  (percent: number | null, status: string, detail?: string): void;
}

export interface NetworkRequestOptions {
  onProgress?: NetworkProgressCallback;
  timeoutMs?: number;
  serviceName?: string;
  responseType?: 'json' | 'blob' | 'arraybuffer' | 'text';
}

export function postFormDataWithProgress<T = any>(
  url: string,
  formData: FormData,
  options: NetworkRequestOptions = {}
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const timeout = options.timeoutMs ?? 120000; // 2 minutes for up to 50 MB files
    xhr.timeout = timeout;

    if (options.responseType && options.responseType !== 'json') {
      xhr.responseType = options.responseType;
    }

    options.onProgress?.(5, 'Validating documents…');

    // 1. Real Upload Progress Events
    if (xhr.upload) {
      xhr.upload.onprogress = (event: ProgressEvent) => {
        if (event.lengthComputable && event.total > 0) {
          const uploadPct = Math.round((event.loaded / event.total) * 100);
          // Scale upload phase to 10% - 65% of overall process
          const scaledPct = Math.min(65, Math.round(10 + uploadPct * 0.55));
          const loadedMb = (event.loaded / (1024 * 1024)).toFixed(1);
          const totalMb = (event.total / (1024 * 1024)).toFixed(1);
          options.onProgress?.(
            scaledPct,
            'Uploading files…',
            `${loadedMb} MB of ${totalMb} MB (${uploadPct}%)`
          );
        } else {
          options.onProgress?.(null, 'Uploading files…');
        }
      };

      xhr.upload.onload = () => {
        // Upload finished — switch to honest indeterminate while processing in runtime
        options.onProgress?.(
          null,
          'Processing PDF…',
          options.serviceName ? `Executing ${options.serviceName} in runtime…` : 'Executing in memory…'
        );
      };
    }

    // 2. Download / Response Receiving Progress
    xhr.onprogress = (event: ProgressEvent) => {
      if (event.lengthComputable && event.total > 0) {
        const dlPct = Math.round((event.loaded / event.total) * 100);
        const scaledDl = Math.min(95, Math.round(75 + dlPct * 0.2));
        options.onProgress?.(scaledDl, 'Generating output…', 'Receiving document data…');
      } else {
        options.onProgress?.(85, 'Generating output…');
      }
    };

    // 3. Request Completion
    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        options.onProgress?.(95, 'Preparing download…');
        if (options.responseType === 'blob' || options.responseType === 'arraybuffer') {
          resolve(xhr.response as T);
          return;
        }

        try {
          const text = xhr.responseText;
          const json = JSON.parse(text);
          resolve(json as T);
        } catch {
          resolve(xhr.response as T);
        }
      } else {
        let errorMsg = `Server error (HTTP ${xhr.status})`;
        try {
          if (xhr.responseType === 'blob' && xhr.response instanceof Blob) {
            const errText = await xhr.response.text();
            try {
              const errJson = JSON.parse(errText);
              if (errJson?.message) errorMsg = errJson.message;
              else if (errJson?.error) errorMsg = errJson.error;
            } catch {
              if (errText) errorMsg = errText;
            }
          } else if (xhr.responseText) {
            const errJson = JSON.parse(xhr.responseText);
            if (errJson?.message) errorMsg = errJson.message;
            else if (errJson?.error) errorMsg = errJson.error;
          }
        } catch {
          if (xhr.statusText) errorMsg = `Server error: ${xhr.statusText} (${xhr.status})`;
        }
        reject(new Error(errorMsg));
      }
    };

    // 4. Network and Timeout Errors
    xhr.onerror = () => {
      reject(new Error('Network error: Unable to connect to the processing service. Please check your connection.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Processing request timed out. Please try again with a smaller file or check your connection.'));
    };

    xhr.onabort = () => {
      reject(new Error('Processing was cancelled.'));
    };

    xhr.open('POST', url, true);
    xhr.send(formData);
  });
}
