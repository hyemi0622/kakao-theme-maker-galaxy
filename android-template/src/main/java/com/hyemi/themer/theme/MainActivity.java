package com.hyemi.themer.theme;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class MainActivity extends Activity {
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(android.view.Gravity.CENTER);
        int pad = Math.round(24 * getResources().getDisplayMetrics().density);
        layout.setPadding(pad, pad, pad, pad);
        TextView title = new TextView(this);
        title.setText("내 캐릭터 테마");
        title.setTextSize(24);
        title.setTextColor(0xff222222);
        layout.addView(title);
        Button apply = new Button(this);
        apply.setText("카카오톡에 적용하기");
        layout.addView(apply);
        apply.setOnClickListener(view -> {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW,
                    Uri.parse("kakaotalk://settings/theme/" + getPackageName())).setPackage("com.kakao.talk"));
                finish();
            } catch (ActivityNotFoundException error) {
                title.setText("카카오톡을 설치한 뒤 다시 적용해 주세요.");
            }
        });
        setContentView(layout);
    }
}
